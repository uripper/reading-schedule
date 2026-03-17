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
const BASE64_BLOCK_SIZE = 4;
const BASE64_PAYLOAD_PATTERN =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PNG_SIGNATURE = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Uint8Array.from([0xff, 0xd8, 0xff]);
const RIFF_SIGNATURE = "RIFF";
const WEBP_SIGNATURE = "WEBP";
const RIFF_SIGNATURE_OFFSET = 0;
const WEBP_SIGNATURE_OFFSET = 8;
const FOUR_BYTE_TAG_LENGTH = 4;
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

/**
 * Splits a data URL into header and payload pieces.
 */
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

/**
 * Returns `true` when a payload is strictly valid base64.
 */
function isValidBase64Payload(payload: string): boolean {
    if (payload.length === 0 || payload.length % BASE64_BLOCK_SIZE !== 0) {
        return false;
    }

    return BASE64_PAYLOAD_PATTERN.test(payload);
}

/**
 * Decodes a base64 payload into image bytes and rejects empty payloads.
 */
function decodeBase64Payload(payload: string): Uint8Array | null {
    if (!isValidBase64Payload(payload)) {
        return null;
    }
    const BYTES = new Uint8Array(Buffer.from(payload, "base64"));

    if (BYTES.byteLength <= 0) {
        return null;
    }

    return BYTES;
}

/**
 * Verifies that the data URL header and payload look like base64 image data.
 */
function hasBase64DataUrlPayload(parts: {
    header: string;
    payload: string;
}): boolean {
    return (
        parts.header.includes(DATA_URL_BASE64_SEGMENT) &&
        isValidBase64Payload(parts.payload)
    );
}

/**
 * Resolves the file extension and payload from a validated data URL header.
 */
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

/**
 * Parses and validates a full base64 data URL string.
 */
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

function hasBytePrefix(bytes: Uint8Array, prefix: Uint8Array): boolean {
    if (bytes.byteLength < prefix.byteLength) {
        return false;
    }

    for (let index = 0; index < prefix.byteLength; index += 1) {
        if (bytes[index] !== prefix[index]) {
            return false;
        }
    }

    return true;
}

function tagAtOffset(bytes: Uint8Array, offset: number): string {
    const END_OFFSET = offset + FOUR_BYTE_TAG_LENGTH;
    if (bytes.byteLength < END_OFFSET) {
        return "";
    }
    return Buffer.from(bytes.subarray(offset, END_OFFSET)).toString("ascii");
}

function isWebpBytes(bytes: Uint8Array): boolean {
    return (
        tagAtOffset(bytes, RIFF_SIGNATURE_OFFSET) === RIFF_SIGNATURE &&
        tagAtOffset(bytes, WEBP_SIGNATURE_OFFSET) === WEBP_SIGNATURE
    );
}

/**
 * Verifies that decoded bytes match the expected image type.
 */
export function bytesMatchCoverExtension(
    bytes: Uint8Array,
    extension: CoverExtension,
): boolean {
    if (extension === EXTENSION_PNG) {
        return hasBytePrefix(bytes, PNG_SIGNATURE);
    }

    if (extension === EXTENSION_WEBP) {
        return isWebpBytes(bytes);
    }

    return hasBytePrefix(bytes, JPEG_SIGNATURE);
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
    if (!bytesMatchCoverExtension(BYTES, PARSED_DATA_URL.extension)) {
        return null;
    }

    return { bytes: BYTES, extension: PARSED_DATA_URL.extension };
}
