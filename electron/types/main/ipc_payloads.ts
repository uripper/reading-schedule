/**
 * @file IPC payload normalization helpers for cover operations.
 */
/**
 * Payload shape accepted for remote cover download requests.
 */
export interface DownloadCoverPayload {
  bookId?: string;
  url?: string;
}

/**
 * Payload shape accepted for uploaded cover persistence requests.
 */
export interface UploadCoverPayload {
  bookId?: string;
  dataUrl?: string;
}
