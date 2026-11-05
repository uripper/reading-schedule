use std::io::{self, Write};

fn main() {
    writeln!(io::stdout().lock(), "cargo:rerun-if-changed=icons")
        .expect("failed to register icon files as Cargo build inputs");
    tauri_build::build()
}
