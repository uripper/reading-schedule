use std::net::IpAddr;
use std::path::Path;

use reqwest::header::{CONTENT_LENGTH, CONTENT_TYPE, LOCATION};
use reqwest::{Client, StatusCode, Url};

use crate::cover_store::data_url::bytes_match_cover_extension;

const CONTENT_TYPE_JPEG: &str = "image/jpeg";
const CONTENT_TYPE_JPG: &str = "image/jpg";
const CONTENT_TYPE_PNG: &str = "image/png";
const CONTENT_TYPE_WEBP: &str = "image/webp";
const DEFAULT_COVER_EXTENSION: &str = ".jpg";
const EXTENSION_JPG: &str = ".jpg";
const EXTENSION_PNG: &str = ".png";
const EXTENSION_WEBP: &str = ".webp";
const HTTP_PROTOCOL: &str = "http";
const HTTPS_PROTOCOL: &str = "https";
const IPV6_HOST_SUFFIX: char = ']';
const IPV6_HOST_PREFIX: char = '[';
const LOCALHOST_HOSTNAME: &str = "localhost";
const LOCALHOST_SUFFIX: &str = ".localhost";
const LOCAL_NETWORK_SUFFIX: &str = ".local";
const MAX_REMOTE_COVER_BYTES: usize = 5 * 1024 * 1024;

type RemoteCover = (Url, Vec<u8>, Option<String>);

enum FetchOutcome {
    Completed(Option<RemoteCover>),
    Redirect(Url),
}

pub async fn fetch_remote_cover(
    client: &Client,
    starting_url: Url,
    remaining_redirects: usize,
) -> Result<Option<RemoteCover>, String> {
    let mut current_url = starting_url;
    let mut redirects_left = remaining_redirects;
    loop {
        let next_url = match fetch_cover_outcome(client, &current_url, redirects_left).await? {
            FetchOutcome::Completed(result) => return Ok(result),
            FetchOutcome::Redirect(next_url) => next_url,
        };
        redirects_left -= 1;
        current_url = next_url;
    }
}

async fn fetch_cover_outcome(
    client: &Client,
    current_url: &Url,
    redirects_left: usize,
) -> Result<FetchOutcome, String> {
    let response = match client.get(current_url.clone()).send().await {
        Ok(response) => response,
        Err(_) => return Ok(FetchOutcome::Completed(None)),
    };
    if let Some(next_url) = next_redirect_url(&response, current_url, redirects_left) {
        return Ok(FetchOutcome::Redirect(next_url));
    }
    if !response.status().is_success() {
        return Ok(FetchOutcome::Completed(None));
    }
    if content_length_too_large(response.headers().get(CONTENT_LENGTH)) {
        return Ok(FetchOutcome::Completed(None));
    }
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Unable to read cover bytes: {error}"))?;
    if !valid_cover_bytes(&bytes, &content_type, current_url) {
        return Ok(FetchOutcome::Completed(None));
    }
    Ok(FetchOutcome::Completed(Some((
        current_url.clone(),
        bytes.to_vec(),
        content_type,
    ))))
}

fn next_redirect_url(
    response: &reqwest::Response,
    current_url: &Url,
    redirects_left: usize,
) -> Option<Url> {
    if !is_redirect_status(response.status()) || redirects_left == 0 {
        return None;
    }
    redirected_cover_url(response.headers().get(LOCATION), current_url)
}

pub fn parsed_http_cover_url(url_text: Option<&str>) -> Option<Url> {
    let normalized = String::from(url_text.unwrap_or_default())
        .trim()
        .to_string();
    if normalized.is_empty() {
        return None;
    }
    let parsed_url = Url::parse(&normalized).ok()?;
    if !is_http_protocol(parsed_url.scheme()) || has_blocked_destination(&parsed_url) {
        return None;
    }
    Some(parsed_url)
}

pub fn extension_for_content_type_and_url(
    content_type: Option<&str>,
    parsed_url: &Url,
) -> &'static str {
    if let Some(extension) = content_type.and_then(extension_for_content_type) {
        return extension;
    }
    match Path::new(parsed_url.path())
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.trim().to_lowercase())
        .as_deref()
    {
        Some("png") => EXTENSION_PNG,
        Some("webp") => EXTENSION_WEBP,
        Some("jpeg") => EXTENSION_JPG,
        Some("jpg") => EXTENSION_JPG,
        _ => DEFAULT_COVER_EXTENSION,
    }
}

fn extension_for_content_type(content_type: &str) -> Option<&'static str> {
    let normalized = content_type.trim().to_lowercase();
    if normalized.contains(CONTENT_TYPE_PNG) {
        return Some(EXTENSION_PNG);
    }
    if normalized.contains(CONTENT_TYPE_WEBP) {
        return Some(EXTENSION_WEBP);
    }
    if normalized.contains(CONTENT_TYPE_JPEG) || normalized.contains(CONTENT_TYPE_JPG) {
        return Some(EXTENSION_JPG);
    }
    None
}

fn valid_cover_bytes(bytes: &[u8], content_type: &Option<String>, current_url: &Url) -> bool {
    let extension = extension_for_content_type_and_url(content_type.as_deref(), current_url);
    !bytes.is_empty()
        && bytes.len() <= MAX_REMOTE_COVER_BYTES
        && bytes_match_cover_extension(bytes, extension)
}

pub(crate) fn content_length_too_large(
    content_length: Option<&reqwest::header::HeaderValue>,
) -> bool {
    let Some(content_length) = content_length else {
        return false;
    };
    let Ok(content_length) = content_length.to_str() else {
        return false;
    };
    let Ok(content_length) = content_length.parse::<usize>() else {
        return false;
    };
    content_length > MAX_REMOTE_COVER_BYTES
}

fn has_blocked_destination(parsed_url: &Url) -> bool {
    parsed_url.port().is_some()
        || !parsed_url.username().is_empty()
        || parsed_url.password().is_some()
        || has_blocked_hostname(parsed_url.host_str().unwrap_or_default())
}

fn has_blocked_hostname(hostname: &str) -> bool {
    let normalized = normalized_hostname(hostname);
    normalized == LOCALHOST_HOSTNAME
        || normalized.ends_with(LOCALHOST_SUFFIX)
        || normalized.ends_with(LOCAL_NETWORK_SUFFIX)
        || normalized.parse::<IpAddr>().is_ok()
}

fn is_http_protocol(protocol: &str) -> bool {
    protocol == HTTP_PROTOCOL || protocol == HTTPS_PROTOCOL
}

fn is_redirect_status(status: StatusCode) -> bool {
    status.is_redirection()
}

fn normalized_hostname(hostname: &str) -> String {
    let trimmed = hostname.trim().trim_end_matches('.').to_lowercase();
    if trimmed.starts_with(IPV6_HOST_PREFIX) && trimmed.ends_with(IPV6_HOST_SUFFIX) {
        return trimmed[1..trimmed.len() - 1].to_string();
    }
    trimmed
}

pub(crate) fn redirected_cover_url(
    location: Option<&reqwest::header::HeaderValue>,
    base_url: &Url,
) -> Option<Url> {
    let location = location?.to_str().ok()?;
    let next_url = base_url.join(location).ok()?;
    if !is_http_protocol(next_url.scheme()) || has_blocked_destination(&next_url) {
        return None;
    }
    Some(next_url)
}

#[cfg(test)]
mod tests {
    use reqwest::header::HeaderValue;

    use super::{content_length_too_large, parsed_http_cover_url, redirected_cover_url};

    #[test]
    fn parsed_http_cover_url_rejects_local_hosts_and_explicit_ports() {
        assert!(parsed_http_cover_url(Some("https://covers.example.com/cover.png")).is_some());
        assert!(parsed_http_cover_url(Some("http://127.0.0.1/cover.png")).is_none());
        assert!(parsed_http_cover_url(Some("https://covers.example.com:8443/cover.png")).is_none());
    }

    #[test]
    fn redirected_cover_url_accepts_open_library_redirects() {
        let base_url =
            parsed_http_cover_url(Some("https://covers.openlibrary.org/b/id/12547191-L.jpg"))
                .expect("expected parsed base url");
        let redirected = redirected_cover_url(
            Some(&HeaderValue::from_static(
                "https://archive.org/download/l_covers_0012/l_covers_0012_54.zip/0012547191-L.jpg",
            )),
            &base_url,
        )
        .expect("expected redirected url");
        assert_eq!(
            redirected.as_str(),
            "https://archive.org/download/l_covers_0012/l_covers_0012_54.zip/0012547191-L.jpg"
        );
    }

    #[test]
    fn content_length_too_large_rejects_oversized_payloads() {
        assert!(content_length_too_large(Some(&HeaderValue::from_static(
            "6291456",
        ))));
        assert!(!content_length_too_large(Some(&HeaderValue::from_static(
            "1024",
        ))));
    }
}
