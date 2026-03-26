use crate::native_planner::models::{
    Book, PlanResult, Settings, SolverProfile, FEASIBLE_STATUS_NAME,
};
use crate::native_planner::solve::plan_greedy;

const FAST_MODE_NOTE: &str = "Fast mode uses greedy planner.";
const GREEDY_PLANNER_NAME: &str = "greedy";

pub fn solve(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    match settings.solver_profile {
        SolverProfile::Fast => fast_profile_result(books, settings),
    }
}

fn fast_profile_result(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    let assignments = plan_greedy(books, settings)?;
    Ok(PlanResult {
        assignments,
        note: FAST_MODE_NOTE.to_string(),
        objective: None,
        planner: GREEDY_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    })
}
