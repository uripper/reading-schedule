use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ExtendedColorType, GenericImageView};
use sha2::{Digest, Sha256};

pub(super) const COVER_MAX_HEIGHT_PX: u32 = 900;
pub(super) const COVER_MAX_WIDTH_PX: u32 = 600;
pub(super) const NORMALIZED_COVER_EXTENSION: &str = ".jpg";

const JPEG_QUALITY: u8 = 86;

pub(super) struct NormalizedCoverAsset {
    pub bytes: Vec<u8>,
    pub hash: String,
}

pub(super) fn normalize_cover_bytes(bytes: &[u8]) -> Result<NormalizedCoverAsset, String> {
    let image = image::load_from_memory(bytes)
        .map_err(|error| format!("Unable to decode cover image: {error}"))?;
    let resized = resize_cover_image(image);
    let encoded = encode_cover_as_jpeg(&resized)?;
    Ok(NormalizedCoverAsset {
        hash: cover_content_hash(&encoded),
        bytes: encoded,
    })
}

fn cover_content_hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn encode_cover_as_jpeg(image: &DynamicImage) -> Result<Vec<u8>, String> {
    let rgb_image = image.to_rgb8();
    let mut encoded = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut encoded, JPEG_QUALITY);
    encoder
        .encode(
            rgb_image.as_raw(),
            rgb_image.width(),
            rgb_image.height(),
            ExtendedColorType::Rgb8,
        )
        .map_err(|error| format!("Unable to encode normalized cover image: {error}"))?;
    Ok(encoded)
}

fn resize_cover_image(image: DynamicImage) -> DynamicImage {
    let (width, height) = image.dimensions();
    if width <= COVER_MAX_WIDTH_PX && height <= COVER_MAX_HEIGHT_PX {
        return image;
    }
    image.resize(
        COVER_MAX_WIDTH_PX,
        COVER_MAX_HEIGHT_PX,
        FilterType::Lanczos3,
    )
}
