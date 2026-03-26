use base64::Engine;

const CONTENT_TYPE_JPEG: &str = "image/jpeg";
const CONTENT_TYPE_JPG: &str = "image/jpg";
const CONTENT_TYPE_PNG: &str = "image/png";
const CONTENT_TYPE_WEBP: &str = "image/webp";
const DATA_URL_BASE64_SUFFIX: &str = ";base64";
const DATA_URL_PREFIX: &str = "data:";
const EXTENSION_JPG: &str = ".jpg";
const EXTENSION_PNG: &str = ".png";
const EXTENSION_WEBP: &str = ".webp";
const JPEG_SIGNATURE_PREFIX: [u8; 3] = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE: [u8; 8] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF_SIGNATURE: &[u8] = b"RIFF";
const WEBP_WEBP_SIGNATURE: &[u8] = b"WEBP";

pub type ParsedCoverData = (Vec<u8>, &'static str);

pub fn bytes_match_cover_extension(bytes: &[u8], extension: &str) -> bool {
    if extension == EXTENSION_PNG {
        return bytes.starts_with(&PNG_SIGNATURE);
    }
    if extension == EXTENSION_WEBP {
        return bytes.len() >= 12
            && &bytes[0..4] == WEBP_RIFF_SIGNATURE
            && &bytes[8..12] == WEBP_WEBP_SIGNATURE;
    }
    bytes.starts_with(&JPEG_SIGNATURE_PREFIX)
}

pub fn parse_cover_data_url(data_url: Option<&str>) -> Option<ParsedCoverData> {
    let normalized = String::from(data_url.unwrap_or_default())
        .trim()
        .to_string();
    let (metadata, encoded) = normalized.split_once(',')?;
    if !metadata.starts_with(DATA_URL_PREFIX) || !metadata.ends_with(DATA_URL_BASE64_SUFFIX) {
        return None;
    }
    let extension = extension_for_data_url_metadata(metadata)?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .ok()?;
    if bytes.is_empty() || !bytes_match_cover_extension(&bytes, extension) {
        return None;
    }
    Some((bytes, extension))
}

#[cfg(test)]
mod tests {
    use super::{bytes_match_cover_extension, parse_cover_data_url};

    const PNG_DATA_URL: &str =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2+3wAAAABJRU5ErkJggg==";

    #[test]
    fn bytes_match_cover_extension_accepts_png_jpeg_and_webp() {
        assert!(bytes_match_cover_extension(
            &[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
            ".png",
        ));
        assert!(bytes_match_cover_extension(
            &[0xff, 0xd8, 0xff, 0xd9],
            ".jpg"
        ));
        assert!(bytes_match_cover_extension(
            b"RIFF\x00\x00\x00\x00WEBP",
            ".webp",
        ));
    }

    #[test]
    fn parse_cover_data_url_rejects_invalid_and_mismatched_payloads() {
        assert!(parse_cover_data_url(Some(PNG_DATA_URL)).is_some());
        assert!(parse_cover_data_url(Some("data:image/png;base64,@@@@")).is_none());
        assert!(parse_cover_data_url(Some("data:image/png;base64,/9j/AA==",)).is_none());
    }
}

fn extension_for_data_url_metadata(metadata: &str) -> Option<&'static str> {
    let mime_type = metadata
        .trim_start_matches(DATA_URL_PREFIX)
        .trim_end_matches(DATA_URL_BASE64_SUFFIX)
        .split(';')
        .next()?
        .trim()
        .to_lowercase();
    match mime_type.as_str() {
        CONTENT_TYPE_JPEG | CONTENT_TYPE_JPG => Some(EXTENSION_JPG),
        CONTENT_TYPE_PNG => Some(EXTENSION_PNG),
        CONTENT_TYPE_WEBP => Some(EXTENSION_WEBP),
        _ => None,
    }
}
