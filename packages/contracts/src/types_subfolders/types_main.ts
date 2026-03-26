/**
 * Shared transport payloads used by app runtimes.
 */

export interface DownloadCoverPayload {
    bookId?: string;
    url?: string;
}

export interface UploadCoverPayload {
    bookId?: string;
    dataUrl?: string;
}
