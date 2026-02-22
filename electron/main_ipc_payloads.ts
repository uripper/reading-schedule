export type DownloadCoverPayload = {
  bookId?: string;
  url?: string;
};

export type UploadCoverPayload = {
  bookId?: string;
  dataUrl?: string;
};

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
