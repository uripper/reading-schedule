use std::path::{Path, PathBuf};

use directories::BaseDirs;

use crate::state_store::{self, RecoverySummary};

const FORCE_FLAG: &str = "--force";
const INPUT_FLAG: &str = "--input";
const TAURI_IDENTIFIER: &str = "com.bartleby.app";
const USER_DATA_DIR_FLAG: &str = "--user-data-dir";

pub fn recover_state_from_args(args: &[String]) -> Result<RecoverySummary, String> {
    let parsed_args = parse_args(args)?;
    state_store::recover_state_from_input_path(
        &parsed_args.input_path,
        &parsed_args.user_data_dir,
        parsed_args.force,
    )
}

struct ParsedArgs {
    force: bool,
    input_path: PathBuf,
    user_data_dir: PathBuf,
}

struct ParserState {
    force: bool,
    input_path: Option<PathBuf>,
    user_data_dir: Option<PathBuf>,
}

fn default_user_data_dir() -> Result<PathBuf, String> {
    let Some(base_dirs) = BaseDirs::new() else {
        return Err("Unable to resolve the default Tauri user-data directory.".to_string());
    };
    Ok(base_dirs.data_local_dir().join(TAURI_IDENTIFIER))
}

fn next_argument_value(args: &[String], index: usize) -> Result<String, String> {
    args.get(index + 1)
        .cloned()
        .ok_or_else(|| format!("Missing value for {}", args[index]))
}

fn parse_path_argument(args: &[String], index: usize) -> Result<PathBuf, String> {
    Ok(Path::new(&next_argument_value(args, index)?).to_path_buf())
}

fn parse_args(args: &[String]) -> Result<ParsedArgs, String> {
    let mut parser_state = ParserState::new();
    let mut index = 0;
    while index < args.len() {
        index = parser_state.parse_arg(args, index)?;
    }
    let Some(input_path) = parser_state.input_path else {
        return Err("Missing required argument: --input <path-to-json-or-sqlite>".to_string());
    };
    let user_data_dir = match parser_state.user_data_dir {
        Some(user_data_dir) => user_data_dir,
        None => default_user_data_dir()?,
    };
    Ok(ParsedArgs {
        force: parser_state.force,
        input_path,
        user_data_dir,
    })
}

impl ParserState {
    fn new() -> Self {
        Self {
            force: false,
            input_path: None,
            user_data_dir: None,
        }
    }

    fn parse_arg(&mut self, args: &[String], index: usize) -> Result<usize, String> {
        match args[index].as_str() {
            FORCE_FLAG => self.parse_force(index),
            INPUT_FLAG => self.parse_input(args, index),
            USER_DATA_DIR_FLAG => self.parse_user_data_dir(args, index),
            other => Err(format!("Unknown argument: {other}")),
        }
    }

    fn parse_force(&mut self, index: usize) -> Result<usize, String> {
        self.force = true;
        Ok(index + 1)
    }

    fn parse_input(&mut self, args: &[String], index: usize) -> Result<usize, String> {
        self.input_path = Some(parse_path_argument(args, index)?);
        Ok(index + 2)
    }

    fn parse_user_data_dir(&mut self, args: &[String], index: usize) -> Result<usize, String> {
        self.user_data_dir = Some(parse_path_argument(args, index)?);
        Ok(index + 2)
    }
}
