//! Reads book-level progress from a user-selected Kobo database without writing to it.
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::{fs, io::ErrorKind, path::Path, time::Duration};

const BUSY_TIMEOUT: Duration = Duration::from_secs(1);
const MAX_RECORDS: usize = 10_000;
const PROGRESS_MAX: f64 = 100.0;
const VERSION_FILE: &str = "version";
const PROGRESS_QUERY: &str = "SELECT ContentID, Title, Attribution, DateLastRead, ___PercentRead
    FROM content WHERE BookID IS NULL AND ___PercentRead > 0
    AND DateLastRead IS NOT NULL ORDER BY DateLastRead DESC";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KoboProgress {
    content_id: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    author: Option<String>,
    date_last_read: String,
    percent_read: f64,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum KoboSnapshot {
    Disconnected,
    Connected {
        #[serde(rename = "deviceId", skip_serializing_if = "Option::is_none")]
        device_id: Option<String>,
        records: Vec<KoboProgress>,
        #[serde(rename = "invalidRows")]
        invalid_rows: usize,
    },
}

/// Returns absence as a normal disconnect and reports other filesystem failures.
fn database_available(path: &Path) -> Result<bool, String> {
    match fs::metadata(path) {
        Ok(metadata) if metadata.is_file() => Ok(true),
        Ok(_) => Err("Select the KoboReader.sqlite file, not a directory.".to_string()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(format!(
            "Cannot access Kobo database: {error}. Check permissions and retry."
        )),
    }
}

/// Treats NULL and blank `Attribution` values as unknown so matching can fall back to titles.
fn credited_author(value: Option<String>) -> Option<String> {
    let author = value?.trim().to_string();
    if author.is_empty() {
        return None;
    }
    Some(author)
}

/// Rejects malformed records without discarding valid books in the same scan.
fn read_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<Option<KoboProgress>> {
    let record = KoboProgress {
        content_id: row.get(0)?,
        title: row.get(1)?,
        author: credited_author(row.get(2)?),
        date_last_read: row.get(3)?,
        percent_read: row.get(4)?,
    };
    if record.content_id.trim().is_empty() || record.title.trim().is_empty() {
        return Ok(None);
    }
    if !record.percent_read.is_finite() || !(0.0..=PROGRESS_MAX).contains(&record.percent_read) {
        return Ok(None);
    }
    Ok(Some(record))
}

/// Holds one read transaction so disconnects and database changes cannot mix scan results.
fn read_records(
    connection: &Connection,
    device_id: Option<String>,
) -> Result<KoboSnapshot, String> {
    let mut statement = connection.prepare(PROGRESS_QUERY).map_err(prepare_error)?;
    let rows = statement
        .query_map([], read_record)
        .map_err(|error| format!("Kobo database is unavailable: {error}. Reconnect and retry."))?;
    let mut records = Vec::new();
    let mut invalid_rows = 0;
    for (index, row) in rows.enumerate() {
        ensure_record_limit(index)?;
        collect_row(row, &mut records, &mut invalid_rows)?;
    }
    Ok(KoboSnapshot::Connected {
        device_id,
        records,
        invalid_rows,
    })
}

/// Distinguishes temporary transfer locks from incompatible database schemas.
fn prepare_error(error: rusqlite::Error) -> String {
    match &error {
        rusqlite::Error::SqliteFailure(code, _)
            if matches!(
                code.code,
                rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked
            ) =>
        {
            "Kobo database is busy. Wait for device transfers to finish and retry.".to_string()
        }
        _ => format!(
            "Unsupported Kobo database schema: {error}. Select KoboReader.sqlite and retry."
        ),
    }
}

/// Bounds database work and fails the entire scan instead of silently truncating books.
fn ensure_record_limit(index: usize) -> Result<(), String> {
    if index >= MAX_RECORDS {
        return Err(format!(
            "Kobo database exceeds {MAX_RECORDS} progress records."
        ));
    }
    Ok(())
}

/// Keeps malformed values separate from I/O failures that invalidate a scan.
fn collect_row(
    row: rusqlite::Result<Option<KoboProgress>>,
    records: &mut Vec<KoboProgress>,
    invalid_rows: &mut usize,
) -> Result<(), String> {
    match row {
        Ok(Some(record)) => records.push(record),
        Ok(None) | Err(rusqlite::Error::InvalidColumnType(..)) => *invalid_rows += 1,
        Err(error) => {
            return Err(format!(
                "Could not finish reading Kobo progress: {error}. Retry after reconnecting."
            ))
        }
    }
    Ok(())
}

/// Opens only an existing absolute path, with SQLite's read-only mode and a bounded lock wait.
pub fn read_progress(database_path: &str) -> Result<KoboSnapshot, String> {
    let path = Path::new(database_path.trim());
    if !path.is_absolute() {
        return Err("Provide the full path to KoboReader.sqlite.".to_string());
    }
    if !database_available(path)? {
        return Ok(KoboSnapshot::Disconnected);
    }
    let connection =
        Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|error| {
            format!("Cannot open Kobo database read-only: {error}. Reconnect and retry.")
        })?;
    connection
        .busy_timeout(BUSY_TIMEOUT)
        .map_err(|error| format!("Cannot configure Kobo read timeout: {error}"))?;
    read_records(&connection, device_serial(path))
}

/// Reads the serial from Kobo's `.kobo/version` file beside the database.
///
/// The serial only labels source links, so a missing or malformed file leaves the device unknown
/// instead of failing the progress scan.
fn device_serial(database_path: &Path) -> Option<String> {
    let contents = fs::read_to_string(database_path.parent()?.join(VERSION_FILE)).ok()?;
    let serial = contents.split(',').next()?.trim();
    if serial.is_empty()
        || !serial
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
    {
        return None;
    }
    Some(serial.to_string())
}

#[cfg(test)]
#[path = "kobo_tests.rs"]
mod tests;
