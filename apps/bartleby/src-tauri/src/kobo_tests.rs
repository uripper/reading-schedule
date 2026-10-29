//! Fixture-based coverage for the read-only Kobo boundary.
use super::{read_progress, KoboSnapshot};
use rusqlite::Connection;
use std::{env, fs, path::PathBuf};
use uuid::Uuid;

struct DatabaseFixture {
    directory: PathBuf,
    path: PathBuf,
}

impl DatabaseFixture {
    fn new() -> Self {
        let directory = env::temp_dir().join(format!("bartleby-kobo-{}", Uuid::new_v4()));
        fs::create_dir_all(&directory).expect("fixture directory");
        let path = directory.join("KoboReader.sqlite");
        Self { directory, path }
    }

    fn database(&self) -> Connection {
        let database = Connection::open(&self.path).expect("fixture database");
        database
            .execute_batch(
                "CREATE TABLE content (
            ContentID TEXT, Title TEXT, DateLastRead TEXT, ___PercentRead REAL, BookID TEXT
        );
        INSERT INTO content VALUES
            ('old', 'Older', '2026-01-01T12:00:00Z', 20, NULL),
            ('new', 'Newer', '2026-02-01T12:00:00Z', 60, NULL),
            ('unread', 'Unread', '2026-02-01T12:00:00Z', 0, NULL),
            ('no-date', 'No date', NULL, 50, NULL),
            ('chapter', 'Chapter', '2026-02-01T12:00:00Z', 80, 'new');",
            )
            .expect("fixture schema and records");
        database
    }

    fn read(&self) -> Result<KoboSnapshot, String> {
        read_progress(self.path.to_str().expect("fixture path"))
    }
}

impl Drop for DatabaseFixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.directory).expect("remove fixture");
    }
}

#[test]
fn reads_only_book_progress_in_last_read_order_without_changing_database() {
    let fixture = DatabaseFixture::new();
    drop(fixture.database());
    let before = fs::read(&fixture.path).expect("database before read");
    let KoboSnapshot::Connected {
        records,
        invalid_rows,
    } = fixture.read().expect("read progress")
    else {
        panic!("expected connection");
    };
    assert_eq!(records.len(), 2);
    assert_eq!(records[0].content_id, "new");
    assert_eq!(records[1].title, "Older");
    assert_eq!(invalid_rows, 0);
    assert_eq!(
        before,
        fs::read(&fixture.path).expect("database after read")
    );
    assert_eq!(
        fs::read_dir(&fixture.directory).expect("directory").count(),
        1
    );
}

#[test]
fn missing_database_is_disconnected_and_is_never_created() {
    let fixture = DatabaseFixture::new();
    assert!(matches!(fixture.read(), Ok(KoboSnapshot::Disconnected)));
    assert!(!fixture.path.exists());
}

#[test]
fn rejects_directories_relative_paths_and_unsupported_schemas() {
    let fixture = DatabaseFixture::new();
    assert!(read_progress(fixture.directory.to_str().expect("directory path")).is_err());
    assert!(read_progress("KoboReader.sqlite").is_err());
    drop(Connection::open(&fixture.path).expect("empty database"));
    assert!(fixture
        .read()
        .expect_err("unsupported schema")
        .contains("schema"));
}

#[test]
fn skips_malformed_rows_without_losing_valid_progress() {
    let fixture = DatabaseFixture::new();
    let database = fixture.database();
    database
        .execute_batch(
            "INSERT INTO content VALUES
        ('bad', 'Bad percent', '2026-02-01T12:00:00Z', 150, NULL),
        ('blank', '', '2026-02-01T12:00:00Z', 50, NULL),
        ('text', 'Wrong type', '2026-02-01T12:00:00Z', 'invalid', NULL);",
        )
        .expect("invalid fixture rows");
    let KoboSnapshot::Connected {
        records,
        invalid_rows,
    } = fixture.read().expect("read valid rows")
    else {
        panic!("expected connection");
    };
    assert_eq!(records.len(), 2);
    assert_eq!(invalid_rows, 3);
}

#[test]
fn locked_database_reports_a_retryable_error_and_recovers() {
    let fixture = DatabaseFixture::new();
    let database = fixture.database();
    database
        .execute_batch("BEGIN EXCLUSIVE")
        .expect("exclusive lock");
    assert!(fixture.read().expect_err("busy database").contains("retry"));
    database.execute_batch("ROLLBACK").expect("release lock");
    assert!(matches!(fixture.read(), Ok(KoboSnapshot::Connected { .. })));
}

#[test]
fn corrupt_database_returns_a_useful_error() {
    let fixture = DatabaseFixture::new();
    fs::write(&fixture.path, "not sqlite").expect("corrupt fixture");
    assert!(fixture
        .read()
        .expect_err("corrupt database")
        .contains("Kobo"));
}
