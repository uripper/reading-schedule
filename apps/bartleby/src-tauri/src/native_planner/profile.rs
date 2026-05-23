use crate::native_planner::models::{
    Book, PlanResult, Settings, SolverProfile, FEASIBLE_STATUS_NAME, PLAN_MODE_SPREAD_OUT,
};
use crate::native_planner::solve::plan_greedy;
use crate::native_planner::{fail_if_cancelled, CancellationCheck};

const FAST_MODE_NOTE: &str = "Fast mode uses greedy planner.";
const GREEDY_PLANNER_NAME: &str = "greedy";
const SPREAD_OUT_DEPRECATION_NOTICE: &str =
    "Spread Out mode is deprecated and no longer supported; using Finish Soon scheduling.";

pub fn solve(
    books: &[Book],
    settings: &Settings,
    should_cancel: &CancellationCheck<'_>,
) -> Result<PlanResult, String> {
    match settings.solver_profile {
        SolverProfile::Fast => fast_profile_result(books, settings, should_cancel),
    }
}

fn deprecation_notice(settings: &Settings) -> Option<String> {
    if settings.plan_mode == PLAN_MODE_SPREAD_OUT {
        return Some(SPREAD_OUT_DEPRECATION_NOTICE.to_string());
    }
    None
}

fn fast_profile_result(
    books: &[Book],
    settings: &Settings,
    should_cancel: &CancellationCheck<'_>,
) -> Result<PlanResult, String> {
    fail_if_cancelled(should_cancel)?;
    let assignments = plan_greedy(books, settings, should_cancel)?;
    Ok(PlanResult {
        assignments,
        deprecation_notice: deprecation_notice(settings),
        note: FAST_MODE_NOTE.to_string(),
        objective: None,
        planner: GREEDY_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    })
}
