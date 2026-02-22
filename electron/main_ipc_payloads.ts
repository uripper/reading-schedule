/**
 * @file IPC payload normalization helpers for cover operations.
 */
/**
 * Payload shape accepted for remote cover download requests.
 */
export type DownloadCoverPayload = {
  bookId?: string;
  url?: string;
};

/**
 * Payload shape accepted for uploaded cover persistence requests.
 */
export type UploadCoverPayload = {
  bookId?: string;
  dataUrl?: string;
};

/**
 * Normalizes unknown download payload input into a safe object.
 */
export function asDownloadCoverPayload(
  value: DownloadCoverPayload | null,
): DownloadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    url: value.url,
    bookId: value.bookId,
  };
}

/**
 * Normalizes unknown upload payload input into a safe object.
 */
export function asUploadCoverPayload(
  value: UploadCoverPayload | null,
): UploadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    dataUrl: value.dataUrl,
    bookId: value.bookId,
  };
}
