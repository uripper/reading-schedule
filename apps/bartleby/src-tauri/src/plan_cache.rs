use std::collections::VecDeque;
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
}

impl PlanCacheState {
    pub(crate) fn shared(&self) -> Arc<Mutex<RecentPlanCache>> {
        Arc::clone(&self.cache)
    }
}

pub(crate) fn generate_plan(
    shared_cache: &Arc<Mutex<RecentPlanCache>>,
    payload: Value,
) -> Result<Value, String> {
    if let Some(result) = shared_cache
        .lock()
        .map_err(|_| "Plan cache lock poisoned".to_string())?
        .cached_result(&payload)
    {
        return Ok(result);
    }
    let result = native_planner::generate_plan(payload.clone())?;
    shared_cache
        .lock()
        .map_err(|_| "Plan cache lock poisoned".to_string())?
        .insert(payload, result.clone());
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{PLAN_CACHE_LIMIT, RecentPlanCache, generate_plan};
    use crate::native_planner;
    use serde_json::json;
    use std::sync::{Arc, Mutex};

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
        let actual = generate_plan(&cache, payload).expect("expected cached result");
        assert_eq!(actual, expected);
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