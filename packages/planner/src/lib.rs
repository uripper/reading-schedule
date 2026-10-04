//! A single scheduling implementation shared by desktop and WebAssembly.

mod native_planner;

#[cfg(target_arch = "wasm32")]
mod wasm;

#[cfg(not(target_arch = "wasm32"))]
pub use native_planner::benchmark;
pub use native_planner::{
    generate_plan, generate_plan_with_cancel, sample_payload, set_summary_timing,
    set_summary_timing_flag, CancellationCheck, PLANNER_SUPERSEDED_MESSAGE,
};
