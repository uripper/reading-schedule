//! Runs cover transport decoding, image transforms, and storage away from UI/async threads.
use super::{data_url, persist_cover_bytes, remote, resolver, CoverAsset};
use crate::app_paths;
use tauri::AppHandle;

const MAX_REMOTE_COVER_REDIRECTS: usize = 5;
const INVALID_COVER_MESSAGE: &str =
    "Invalid cover image. Select a PNG, JPG, or WEBP file to retry.";

/// Downloads asynchronously and normalizes on the blocking worker pool.
pub async fn download_cover(
    app: &AppHandle,
    url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let Some(parsed_url) = remote::parsed_http_cover_url(url.as_deref()) else {
        return Ok(String::new());
    };
    let client = resolver::cover_client()?;
    let Some((_resolved_url, bytes, _content_type)) =
        remote::fetch_remote_cover(&client, parsed_url, MAX_REMOTE_COVER_REDIRECTS).await?
    else {
        return Ok(String::new());
    };
    let data_directory = app_paths::canonical_data_directory(app)?;
    process_cover(move || {
        persist_cover_bytes(
            &data_directory,
            book_id.as_deref(),
            CoverAsset { bytes: &bytes },
        )
    })
    .await
}

/// Decodes transport and image data on a worker, keeping the UI thread available.
pub async fn import_cover(
    app: &AppHandle,
    data_url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let data_directory = app_paths::canonical_data_directory(app)?;
    process_cover(move || {
        let (bytes, _extension) = data_url::parse_cover_data_url(data_url.as_deref())
            .ok_or_else(|| INVALID_COVER_MESSAGE.to_string())?;
        persist_cover_bytes(
            &data_directory,
            book_id.as_deref(),
            CoverAsset { bytes: &bytes },
        )
    })
    .await
}

/// Central worker boundary shared by remote and uploaded cover processing.
async fn process_cover(
    operation: impl FnOnce() -> Result<String, String> + Send + 'static,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| format!("Cover processing task failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::process_cover;
    use std::sync::mpsc;
    use std::time::Duration;

    const TEST_TIMEOUT_SECONDS: u64 = 10;

    #[test]
    fn slow_cover_worker_does_not_block_other_work() {
        let (started_sender, started_receiver) = mpsc::channel();
        let (release_sender, release_receiver) = mpsc::channel();
        let calling_thread = std::thread::current().id();
        let slow_cover = tauri::async_runtime::spawn(process_cover(move || {
            assert_ne!(calling_thread, std::thread::current().id());
            started_sender.send(()).expect("signal worker start");
            release_receiver.recv().expect("release slow cover");
            Ok("slow.jpg".to_string())
        }));
        started_receiver
            .recv_timeout(Duration::from_secs(TEST_TIMEOUT_SECONDS))
            .expect("cover starts independently");
        let other_cover =
            tauri::async_runtime::block_on(process_cover(|| Ok("other.jpg".to_string())))
                .expect("other work finishes while slow cover is pending");
        assert_eq!(other_cover, "other.jpg");
        release_sender.send(()).expect("release worker");
        assert_eq!(
            tauri::async_runtime::block_on(slow_cover).unwrap().unwrap(),
            "slow.jpg"
        );
    }

    #[test]
    fn failed_cover_worker_allows_later_processing() {
        let failed = tauri::async_runtime::block_on(process_cover(|| {
            Err("Unable to decode cover image".to_string())
        }));
        assert!(failed.unwrap_err().contains("Unable to decode"));
        let retried = tauri::async_runtime::block_on(process_cover(|| Ok("retry.jpg".to_string())));
        assert_eq!(retried.unwrap(), "retry.jpg");
    }
}
