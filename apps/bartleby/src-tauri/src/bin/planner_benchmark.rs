//! Terminal entry point for measuring the production greedy reading planner.

use bartleby_app_lib::run_planner_benchmark;

fn main() -> Result<(), String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    run_planner_benchmark(&args)
}
