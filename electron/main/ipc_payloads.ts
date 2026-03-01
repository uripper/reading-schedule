import {
    type DownloadCoverPayload,
    type UploadCoverPayload,
} from "../types/types.js";

/**
 * Normalizes unknown download payload input into a safe object.
 * @param value Raw payload value passed from renderer IPC.
 * @returns Normalized download-cover payload.
 */
export function asDownloadCoverPayload(
    value: DownloadCoverPayload | null,
): DownloadCoverPayload {
    if (!value) {
        return {};
    }
    return {
        bookId: value.bookId,
        url: value.url,
    };
}

/**
 * Normalizes unknown upload payload input into a safe object.
 * @param value Raw payload value passed from renderer IPC.
 * @returns Normalized upload-cover payload.
 */
export function asUploadCoverPayload(
    value: UploadCoverPayload | null,
): UploadCoverPayload {
    if (!value) {
        return {};
    }
    return {
        bookId: value.bookId,
        dataUrl: value.dataUrl,
    };
}
