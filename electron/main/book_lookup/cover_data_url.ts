/**
 * @file Data URL parsing helpers for uploaded book covers.
 */
import type { CoverExtension } from "../../types/types.js";

const CONTENT_TYPE_PNG = "image/png";
const CONTENT_TYPE_WEBP = "image/webp";
const CONTENT_TYPE_JPEG = "image/jpeg";
const CONTENT_TYPE_JPG = "image/jpg";
const EXTENSION_JPG = ".jpg";
const EXTENSION_PNG = ".png";
const EXTENSION_WEBP = ".webp";
const DATA_URL_PREFIX = "data:";
const DATA_URL_SEPARATOR = ",";
const DATA_URL_BASE64_SEGMENT = ";base64";

/**
 * Maps an image MIME type from a data URL to a supported file extension.
 * @param mimeType MIME type parsed from the data URL header.
 * @returns Supported cover extension, or null when unsupported.
 */
function extensionForDataMime(mimeType: string): CoverExtension | null {
    const normalizedMime = String(mimeType || "")
        .trim()
        .toLowerCase();
    if (normalizedMime === CONTENT_TYPE_PNG) {
        return EXTENSION_PNG;
    }
    if (normalizedMime === CONTENT_TYPE_WEBP) {
        return EXTENSION_WEBP;
    }
    if (
        normalizedMime === CONTENT_TYPE_JPEG ||
        normalizedMime === CONTENT_TYPE_JPG
    ) {
        return EXTENSION_JPG;
    }
    return null;
}

/**
 * Parses a base64 data URL and returns image bytes with an allowed extension.
 * @param coverDataUrl Data URL candidate for an uploaded cover image.
 * @returns Decoded bytes and extension, or null when the payload is invalid.
 */
export function parseCoverDataUrl(
    coverDataUrl: string | undefined,
): { bytes: Uint8Array; extension: CoverExtension } | null {
    const normalized = String(coverDataUrl ?? "").trim();
    if (!normalized.startsWith(DATA_URL_PREFIX)) {
        return null;
    }
    const separatorIndex = normalized.indexOf(DATA_URL_SEPARATOR);
    if (separatorIndex < 0) {
        return null;
    }
    const header = normalized.slice(DATA_URL_PREFIX.length, separatorIndex);
    const payload = normalized.slice(separatorIndex + 1);
    if (!header.includes(DATA_URL_BASE64_SEGMENT) || !payload) {
        return null;
    }
    const mimeType = header.split(";")[0];
    const extension = extensionForDataMime(mimeType);
    if (!extension) {
        return null;
    }
    let bytes: Uint8Array;
    try {
        bytes = new Uint8Array(Buffer.from(payload, "base64"));
    } catch {
        return null;
    }
    if (bytes.byteLength <= 0) {
        return null;
    }
    return { bytes, extension };
}
