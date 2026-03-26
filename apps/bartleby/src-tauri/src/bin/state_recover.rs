use std::io::{self, Write};
use std::process::ExitCode;

use bartleby_app_lib::recover_state_from_args;

fn main() -> ExitCode {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match recover_state_from_args(&args) {
        Ok(result) => write_success(&result),
        Err(error) => {
            write_failure(&error);
            ExitCode::from(1)
        }
    }
}

fn write_failure(error: &str) {
    let _ = io::stderr().write_all(format!("State recovery failed: {error}\n").as_bytes());
}

fn write_success(result: &bartleby_app_lib::RecoverySummary) -> ExitCode {
    let _ = io::stdout().write_all(success_message(result).as_bytes());
    ExitCode::SUCCESS
}

fn success_message(result: &bartleby_app_lib::RecoverySummary) -> String {
    let mut lines = vec![
        format!("Recovered source type: {}", result.source_type),
        format!("Input path: {}", result.input_path),
        format!("User data dir: {}", result.user_data_dir),
        format!("Books: {}", result.counts.books),
        format!("Sessions: {}", result.counts.sessions),
        format!("Schedule rows: {}", result.counts.schedule_rows),
        format!(
            "Schedule completions: {}",
            result.counts.schedule_completions
        ),
    ];
    lines.extend(backup_lines(&result.backups));
    format!("{}\n", lines.join("\n"))
}

fn backup_lines(backups: &[String]) -> Vec<String> {
    if backups.is_empty() {
        return Vec::new();
    }
    let mut lines = vec!["Created backups:".to_string()];
    lines.extend(backups.iter().map(|backup_path| format!("- {backup_path}")));
    lines
}
