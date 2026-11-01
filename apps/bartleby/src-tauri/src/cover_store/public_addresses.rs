//! Restricts cover connections to ordinary public Internet address space.
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

// Conservative exclusions from the IANA special-purpose registries, plus multicast.
const BLOCKED_IPV4_NETWORKS: &[(Ipv4Addr, u32)] = &[
    (Ipv4Addr::new(0, 0, 0, 0), 8),
    (Ipv4Addr::new(10, 0, 0, 0), 8),
    (Ipv4Addr::new(100, 64, 0, 0), 10),
    (Ipv4Addr::new(127, 0, 0, 0), 8),
    (Ipv4Addr::new(169, 254, 0, 0), 16),
    (Ipv4Addr::new(172, 16, 0, 0), 12),
    (Ipv4Addr::new(192, 0, 0, 0), 24),
    (Ipv4Addr::new(192, 0, 2, 0), 24),
    (Ipv4Addr::new(192, 88, 99, 0), 24),
    (Ipv4Addr::new(192, 168, 0, 0), 16),
    (Ipv4Addr::new(198, 18, 0, 0), 15),
    (Ipv4Addr::new(198, 51, 100, 0), 24),
    (Ipv4Addr::new(203, 0, 113, 0), 24),
    (Ipv4Addr::new(224, 0, 0, 0), 4),
    (Ipv4Addr::new(240, 0, 0, 0), 4),
];
const IPV6_GLOBAL_NETWORK: Ipv6Addr = Ipv6Addr::new(0x2000, 0, 0, 0, 0, 0, 0, 0);
const IPV6_GLOBAL_PREFIX_BITS: u32 = 3;
const BLOCKED_IPV6_NETWORKS: &[(Ipv6Addr, u32)] = &[
    (Ipv6Addr::new(0x2001, 0, 0, 0, 0, 0, 0, 0), 23),
    (Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2002, 0, 0, 0, 0, 0, 0, 0), 16),
    (Ipv6Addr::new(0x3fff, 0, 0, 0, 0, 0, 0, 0), 20),
];

/// Rejects local, special-purpose, multicast, and IPv4 transition destinations.
pub(super) fn is_public_address(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => is_public_ipv4(address),
        IpAddr::V6(address) => is_public_ipv6(address),
    }
}

/// Checks every reserved IPv4 prefix rather than relying only on RFC1918 ranges.
fn is_public_ipv4(address: Ipv4Addr) -> bool {
    !BLOCKED_IPV4_NETWORKS.iter().any(|(network, prefix)| {
        let mask = u32::MAX << (u32::BITS - prefix);
        u32::from(address) & mask == u32::from(*network)
    })
}

/// Permits global unicast while excluding documentation and transition networks.
fn is_public_ipv6(address: Ipv6Addr) -> bool {
    let global_mask = u128::MAX << (u128::BITS - IPV6_GLOBAL_PREFIX_BITS);
    if u128::from(address) & global_mask != u128::from(IPV6_GLOBAL_NETWORK) {
        return false;
    }
    !BLOCKED_IPV6_NETWORKS.iter().any(|(network, prefix)| {
        let mask = u128::MAX << (u128::BITS - prefix);
        u128::from(address) & mask == u128::from(*network)
    })
}

#[cfg(test)]
mod tests {
    use super::{is_public_address, BLOCKED_IPV4_NETWORKS, BLOCKED_IPV6_NETWORKS};
    use std::net::IpAddr;

    #[test]
    fn rejects_each_special_purpose_network() {
        assert!(BLOCKED_IPV4_NETWORKS
            .iter()
            .all(|(address, _)| !is_public_address(IpAddr::V4(*address))));
        assert!(BLOCKED_IPV6_NETWORKS
            .iter()
            .all(|(address, _)| !is_public_address(IpAddr::V6(*address))));
    }

    #[test]
    fn rejects_internal_multicast_and_ipv4_transition_addresses() {
        let blocked = [
            "0.0.0.0",
            "10.1.2.3",
            "100.100.100.100",
            "127.1.2.3",
            "169.254.169.254",
            "172.31.255.255",
            "192.168.1.1",
            "198.19.255.255",
            "239.1.2.3",
            "255.255.255.255",
            "::",
            "::1",
            "fc00::1",
            "fe80::1",
            "ff02::1",
            "::ffff:127.0.0.1",
            "::ffff:8.8.8.8",
            "64:ff9b::a00:1",
            "2002:7f00:1::1",
            "2001:db8::1",
            "3fff:fff::1",
        ];
        assert!(blocked
            .iter()
            .all(|address| !is_public_address(address.parse().unwrap())));
    }

    #[test]
    fn accepts_public_ipv4_and_ipv6_addresses() {
        let public = [
            "8.8.8.8",
            "1.1.1.1",
            "93.184.216.34",
            "2606:4700:4700::1111",
            "2001:4860:4860::8888",
        ];
        assert!(public
            .iter()
            .all(|address| is_public_address(address.parse().unwrap())));
    }
}
