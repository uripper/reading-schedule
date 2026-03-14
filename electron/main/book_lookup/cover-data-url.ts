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
const DATA_MIME_TO_EXTENSION: Partial<Record<string, CoverExtension>> = {
    [CONTENT_TYPE_JPEG]: EXTENSION_JPG,
    [CONTENT_TYPE_JPG]: EXTENSION_JPG,
    [CONTENT_TYPE_PNG]: EXTENSION_PNG,
    [CONTENT_TYPE_WEBP]: EXTENSION_WEBP,
} as const;

/**
 * Maps an image MIME type from a data URL to a supported file extension.
 * @param mimeType - MIME type parsed from the data URL header.
 * @returns Supported cover extension, or null when unsupported.
 */
function extensionForDataMime(mimeType: string): CoverExtension | null {
    const NORMALIZED_MIME = mimeType.trim().toLowerCase();
    return DATA_MIME_TO_EXTENSION[NORMALIZED_MIME] ?? null;
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

function hasBase64DataUrlPayload(parts: {
    header: string;
    payload: string;
}): boolean {
    return (
        parts.header.includes(DATA_URL_BASE64_SEGMENT) && parts.payload !== ""
    );
}

function parsedDataUrlPayload(parts: {
    header: string;
    payload: string;
}): { extension: CoverExtension; payload: string } | null {
    const EXTENSION = extensionForDataMime(parts.header.split(";")[0]);
    if (EXTENSION === null) {
        return null;
    }
    return { extension: EXTENSION, payload: parts.payload };
}

function parsedBase64DataUrl(value: string): {
    extension: CoverExtension;
    payload: string;
} | null {
    const DATA_URL_PARTS = splitDataUrl(value);
    if (DATA_URL_PARTS === null || !hasBase64DataUrlPayload(DATA_URL_PARTS)) {
        return null;
    }
    return parsedDataUrlPayload(DATA_URL_PARTS);
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
