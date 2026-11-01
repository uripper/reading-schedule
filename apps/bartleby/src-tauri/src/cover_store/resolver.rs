//! Validates DNS results in the connection resolver, preventing DNS-check/connect races.
use super::public_addresses::is_public_address;
use reqwest::dns::{Addrs, Name, Resolve, Resolving};
use reqwest::Client;
use std::error::Error;
use std::io;
use std::net::{SocketAddr, ToSocketAddrs};
use std::sync::Arc;
use std::time::Duration;

pub(super) const COVER_NETWORK_TIMEOUT: Duration = Duration::from_secs(20);
const COVER_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const DNS_RESOLUTION_PORT: u16 = 0;
const BLOCKED_DESTINATION_MESSAGE: &str =
    "Cover destinations must resolve only to public Internet addresses.";

type AddressLookup = fn(&str) -> io::Result<Vec<SocketAddr>>;
type ResolutionResult = Result<Addrs, Box<dyn Error + Send + Sync>>;

/// Supplies the exact validated DNS results consumed by the HTTP connector.
struct CoverResolver {
    lookup: AddressLookup,
}

impl Resolve for CoverResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let hostname = name.as_str().to_owned();
        Box::pin(resolve_host(hostname, self.lookup))
    }
}

/// Validates the complete DNS answer once and returns those same socket addresses.
async fn resolve_host(hostname: String, lookup: AddressLookup) -> ResolutionResult {
    let addresses = tauri::async_runtime::spawn_blocking(move || lookup(&hostname)).await??;
    let addresses = validate_addresses(addresses)?;
    let addresses: Addrs = Box::new(addresses.into_iter());
    Ok(addresses)
}

/// Disables proxy and redirect bypasses; every destination uses the guarded resolver.
pub(super) fn cover_client() -> Result<Client, String> {
    client_with_resolver(CoverResolver {
        lookup: lookup_addresses,
    })
}

/// Shares the production client configuration with deterministic resolver tests.
fn client_with_resolver(resolver: CoverResolver) -> Result<Client, String> {
    Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .dns_resolver(Arc::new(resolver))
        .connect_timeout(COVER_CONNECT_TIMEOUT)
        .timeout(COVER_NETWORK_TIMEOUT)
        .build()
        .map_err(|error| format!("Unable to build cover download client: {error}"))
}

/// Runs system DNS away from the async executor and leaves ports to the URL scheme.
fn lookup_addresses(hostname: &str) -> io::Result<Vec<SocketAddr>> {
    (hostname, DNS_RESOLUTION_PORT)
        .to_socket_addrs()
        .map(Iterator::collect)
}

/// Fails closed for empty or mixed public/private DNS answers.
fn validate_addresses(addresses: Vec<SocketAddr>) -> io::Result<Vec<SocketAddr>> {
    if addresses.is_empty()
        || addresses
            .iter()
            .any(|address| !is_public_address(address.ip()))
    {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            BLOCKED_DESTINATION_MESSAGE,
        ));
    }
    Ok(addresses)
}

#[cfg(test)]
#[path = "resolver_tests.rs"]
mod tests;
