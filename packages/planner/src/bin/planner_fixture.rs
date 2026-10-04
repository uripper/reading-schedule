//! Native JSON fixture runner for desktop/WebAssembly parity regression tests.

use std::{env, fs};

fn main() -> Result<(), String> {
    let path = env::args()
        .nth(1)
        .ok_or("Pass the path to a planner JSON fixture.")?;
    let input = fs::read_to_string(path)
        .map_err(|error| format!("Unable to read planner fixture: {error}"))?;
    let payload =
        serde_json::from_str(&input).map_err(|error| format!("Invalid fixture JSON: {error}"))?;
    let output = bartleby_planner::generate_plan(payload)?;
    println!("{output}");
    Ok(())
}
