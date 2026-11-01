//! Regression coverage for guarded connection resolution, including redirect destinations.
use super::{client_with_resolver, validate_addresses, CoverResolver};
use crate::cover_store::remote::{parsed_http_cover_url, redirected_cover_url};
use reqwest::dns::{Name, Resolve};
use reqwest::header::HeaderValue;
use std::io;
use std::net::SocketAddr;

const PUBLIC_ADDRESS: &str = "93.184.216.34:0";
const PRIVATE_ADDRESS: &str = "127.0.0.1:0";

/// Supplies a permitted hostname with an internal DNS result without real network access.
fn private_lookup(_hostname: &str) -> io::Result<Vec<SocketAddr>> {
    Ok(vec![PRIVATE_ADDRESS.parse().unwrap()])
}

/// Gives the resolver a deterministic pair whose values must survive validation unchanged.
fn public_lookup(_hostname: &str) -> io::Result<Vec<SocketAddr>> {
    Ok(vec![
        PUBLIC_ADDRESS.parse().unwrap(),
        "[2606:4700:4700::1111]:0".parse().unwrap(),
    ])
}

#[test]
fn rejects_empty_and_mixed_public_private_dns_answers() {
    let public = PUBLIC_ADDRESS.parse().unwrap();
    let private = PRIVATE_ADDRESS.parse().unwrap();
    assert!(validate_addresses(Vec::new()).is_err());
    assert!(validate_addresses(vec![public, private]).is_err());
    assert!(validate_addresses(vec![private, public]).is_err());
}

#[test]
fn connector_receives_exactly_the_validated_addresses() {
    let resolver = CoverResolver {
        lookup: public_lookup,
    };
    let name: Name = "covers.example.com".parse().unwrap();
    let addresses = tauri::async_runtime::block_on(resolver.resolve(name)).unwrap();
    assert_eq!(
        addresses.collect::<Vec<_>>(),
        public_lookup("unused").unwrap()
    );
}

#[test]
fn public_looking_initial_hostname_cannot_connect_to_private_dns_answer() {
    let client = client_with_resolver(CoverResolver {
        lookup: private_lookup,
    })
    .unwrap();
    let url = parsed_http_cover_url(Some("http://covers.example.com/image.jpg")).unwrap();
    let error = tauri::async_runtime::block_on(async { client.get(url).send().await }).unwrap_err();
    assert!(format!("{error:?}").contains("public Internet addresses"));
}

#[test]
fn public_looking_redirect_hostname_cannot_connect_to_private_dns_answer() {
    let client = client_with_resolver(CoverResolver {
        lookup: private_lookup,
    })
    .unwrap();
    let initial = parsed_http_cover_url(Some("https://covers.example.com/image.jpg")).unwrap();
    let redirect = HeaderValue::from_static("http://internal.example.com/private.jpg");
    let destination = redirected_cover_url(Some(&redirect), &initial).unwrap();
    let error =
        tauri::async_runtime::block_on(async { client.get(destination).send().await }).unwrap_err();
    assert!(format!("{error:?}").contains("public Internet addresses"));
}

#[test]
fn literal_private_redirects_remain_rejected_before_resolution() {
    let initial = parsed_http_cover_url(Some("https://covers.example.com/image.jpg")).unwrap();
    let redirect = HeaderValue::from_static("http://127.0.0.1/private.jpg");
    assert!(redirected_cover_url(Some(&redirect), &initial).is_none());
}

/// Emulates a stalled system lookup; no connection is attempted before it completes.
fn slow_lookup(_hostname: &str) -> io::Result<Vec<SocketAddr>> {
    const DNS_TEST_DELAY: std::time::Duration = std::time::Duration::from_millis(100);
    std::thread::sleep(DNS_TEST_DELAY);
    private_lookup("unused")
}

#[test]
fn request_deadline_includes_dns_resolution() {
    const REQUEST_TEST_DEADLINE: std::time::Duration = std::time::Duration::from_millis(10);
    let client = client_with_resolver(CoverResolver {
        lookup: slow_lookup,
    })
    .unwrap();
    let result = tauri::async_runtime::block_on(async {
        client
            .get("http://covers.example.com/image.jpg")
            .timeout(REQUEST_TEST_DEADLINE)
            .send()
            .await
    });
    assert!(result.unwrap_err().is_timeout());
}
