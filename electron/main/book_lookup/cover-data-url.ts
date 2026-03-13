/**
 * Data URL parsing helpers for uploaded book covers.
 */
import type { CoverExtension } from "@reading-schedule/contracts";

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
 * @param mimeType - MIME type parsed from the data URL header.
 * @returns Supported cover extension, or null when unsupported.
 */
function extensionForDataMime(mimeType: string): CoverExtension | null {
    const NORMALIZED_MIME = mimeType.trim().toLowerCase();
    if (NORMALIZED_MIME === CONTENT_TYPE_PNG) {
        return EXTENSION_PNG;
    }
    if (NORMALIZED_MIME === CONTENT_TYPE_WEBP) {
        return EXTENSION_WEBP;
    }
    if (
        NORMALIZED_MIME === CONTENT_TYPE_JPEG ||
        NORMALIZED_MIME === CONTENT_TYPE_JPG
    ) {
        return EXTENSION_JPG;
    }
    return null;
}

function splitDataUrl(
    value: string,
): { header: string; payload: string } | null {
    if (!value.startsWith(DATA_URL_PREFIX)) {
        return null;
    }

    const SEPARATOR_INDEX = value.indexOf(DATA_URL_SEPARATOR);

    if (SEPARATOR_INDEX < 0) {
        return null;
    }

    return {
        header: value.slice(DATA_URL_PREFIX.length, SEPARATOR_INDEX),
        payload: value.slice(SEPARATOR_INDEX + 1),
    };
}

function decodeBase64Payload(payload: string): Uint8Array | null {
    let bytes: Uint8Array;

    try {
        bytes = new Uint8Array(Buffer.from(payload, "base64"));
    } catch {
        return null;
    }

    if (bytes.byteLength <= 0) {
        return null;
    }

    return bytes;
}

function dataMimeExtension(header: string): CoverExtension | null {
    return extensionForDataMime(header.split(";")[0]);
}

function parsedBase64DataUrl(value: string): {
    extension: CoverExtension;
    payload: string;
} | null {
    const DATA_URL_PARTS = splitDataUrl(value);

    if (DATA_URL_PARTS === null) {
        return null;
    }

    if (
        !DATA_URL_PARTS.header.includes(DATA_URL_BASE64_SEGMENT) ||
        DATA_URL_PARTS.payload === ""
    ) {
        return null;
    }

    const EXTENSION = dataMimeExtension(DATA_URL_PARTS.header);

    if (EXTENSION === null) {
        return null;
    }

    return {
        extension: EXTENSION,
        payload: DATA_URL_PARTS.payload,
    };
}

/**
 * Parses a base64 data URL and returns image bytes with an allowed extension.
 * @param coverDataUrl - Data URL candidate for an uploaded cover image.
 * @returns Decoded bytes and extension, or null when the payload is invalid.
 */
export function parseCoverDataUrl(
    coverDataUrl: string | undefined,
): { bytes: Uint8Array; extension: CoverExtension } | null {
    const NORMALIZED = String(coverDataUrl ?? "").trim();
    const PARSED_DATA_URL = parsedBase64DataUrl(NORMALIZED);

    if (PARSED_DATA_URL === null) {
        return null;
    }

    const BYTES = decodeBase64Payload(PARSED_DATA_URL.payload);

    if (BYTES === null) {
        return null;
    }

    return { bytes: BYTES, extension: PARSED_DATA_URL.extension };
}
