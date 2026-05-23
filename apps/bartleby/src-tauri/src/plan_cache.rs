use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use serde_json::Value;

use crate::native_planner;

const PLAN_CACHE_LIMIT: usize = 5;

#[derive(Clone, Debug)]
struct CachedPlan {
    payload: Value,
    result: Value,
}

#[derive(Debug, Default)]
pub(crate) struct RecentPlanCache {
    entries: VecDeque<CachedPlan>,
}

impl RecentPlanCache {
    fn cached_result(&mut self, payload: &Value) -> Option<Value> {
        let index = self
            .entries
            .iter()
            .position(|entry| entry.payload == *payload)?;
        let entry = self.entries.remove(index)?;
        let result = entry.result.clone();
        self.entries.push_front(entry);
        Some(result)
    }

    fn insert(&mut self, payload: Value, result: Value) {
        self.entries.retain(|entry| entry.payload != payload);
        self.entries.push_front(CachedPlan { payload, result });
        self.trim_to_limit();
    }

    fn trim_to_limit(&mut self) {
        self.entries.truncate(PLAN_CACHE_LIMIT);
    }
}

#[derive(Clone, Debug, Default)]
pub struct PlanCacheState {
    cache: Arc<Mutex<RecentPlanCache>>,
    latest_request_id: Arc<AtomicU64>,
}

impl PlanCacheState {
    pub(crate) fn latest_request_id(&self) -> Arc<AtomicU64> {
        Arc::clone(&self.latest_request_id)
    }

    pub(crate) fn next_request_id(&self) -> u64 {
        self.latest_request_id.fetch_add(1, Ordering::AcqRel) + 1
    }

    pub(crate) fn shared(&self) -> Arc<Mutex<RecentPlanCache>> {
        Arc::clone(&self.cache)
    }
}

pub(crate) struct PlanRequest<'a> {
    latest_request_id: &'a AtomicU64,
    request_id: u64,
}

impl PlanRequest<'_> {
    pub(crate) fn new(latest_request_id: &AtomicU64, request_id: u64) -> PlanRequest<'_> {
        PlanRequest {
            latest_request_id,
            request_id,
        }
    }

    fn ensure_current(&self) -> Result<(), String> {
        match self.is_superseded() {
            true => Err(native_planner::PLANNER_SUPERSEDED_MESSAGE.to_string()),
            false => Ok(()),
        }
    }

    fn is_superseded(&self) -> bool {
        self.latest_request_id.load(Ordering::Acquire) != self.request_id
    }
}

pub(crate) fn generate_plan(
    shared_cache: &Arc<Mutex<RecentPlanCache>>,
    request: PlanRequest<'_>,
    payload: Value,
) -> Result<Value, String> {
    request.ensure_current()?;
    if let Some(result) = shared_cache
        .lock()
        .map_err(|_| "Plan cache lock poisoned".to_string())?
        .cached_result(&payload)
    {
        request.ensure_current()?;
        return Ok(result);
    }
    let result =
        native_planner::generate_plan_with_cancel(payload.clone(), &|| request.is_superseded())?;
    request.ensure_current()?;
    shared_cache
        .lock()
        .map_err(|_| "Plan cache lock poisoned".to_string())?
        .insert(payload, result.clone());
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{generate_plan, PlanRequest, RecentPlanCache, PLAN_CACHE_LIMIT};
    use crate::native_planner;
    use serde_json::json;
    use std::sync::atomic::AtomicU64;
    use std::sync::{Arc, Mutex};

    const CURRENT_REQUEST_ID: u64 = 1;

    fn current_request_id() -> Arc<AtomicU64> {
        Arc::new(AtomicU64::new(CURRENT_REQUEST_ID))
    }

    #[test]
    fn generate_plan_returns_cached_result_for_matching_payload() {
        let cache = Arc::new(Mutex::new(RecentPlanCache::default()));
        let payload = native_planner::sample_payload().expect("expected sample payload");
        let expected = json!({
            "schedule": [],
            "summary": {
                "note": "cached",
                "planner": "cached",
                "status": "cached",
            },
        });
        cache
            .lock()
            .expect("expected cache lock")
            .insert(payload.clone(), expected.clone());
        let latest_request_id = current_request_id();
        let request = PlanRequest::new(&latest_request_id, CURRENT_REQUEST_ID);
        let actual = generate_plan(&cache, request, payload).expect("expected cached result");
        assert_eq!(actual, expected);
    }

    #[test]
    fn generate_plan_returns_superseded_error_for_stale_request() {
        let cache = Arc::new(Mutex::new(RecentPlanCache::default()));
        let latest_request_id = Arc::new(AtomicU64::new(CURRENT_REQUEST_ID + 1));
        let payload = native_planner::sample_payload().expect("expected sample payload");
        let request = PlanRequest::new(&latest_request_id, CURRENT_REQUEST_ID);
        let error =
            generate_plan(&cache, request, payload).expect_err("expected superseded planner error");

        assert_eq!(error, native_planner::PLANNER_SUPERSEDED_MESSAGE);
        assert!(cache
            .lock()
            .expect("expected cache lock")
            .entries
            .is_empty());
    }

    #[test]
    fn recent_plan_cache_evicts_oldest_entry_after_limit() {
        let mut cache = RecentPlanCache::default();
        for index in 0..=PLAN_CACHE_LIMIT {
            cache.insert(
                json!({
                    "request": index,
                }),
                json!({
                    "result": index,
                }),
            );
        }
        assert_eq!(cache.entries.len(), PLAN_CACHE_LIMIT);
        assert!(cache.cached_result(&json!({ "request": 0 })).is_none());
        assert_eq!(
            cache.cached_result(&json!({ "request": PLAN_CACHE_LIMIT })),
            Some(json!({
                "result": PLAN_CACHE_LIMIT,
            }))
        );
    }
}
