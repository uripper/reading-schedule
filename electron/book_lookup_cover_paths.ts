/**
 * @file File-path and extension utilities for locally stored cover images.
 */
import fs from "node:fs";
import path from "node:path";

const COVER_DIRECTORY_NAME = "book_covers";
const COVER_FILE_FALLBACK_PREFIX = "cover";
const COVER_FILE_VERSION_SEPARATOR = "-";
const MAX_SAFE_FILE_BASE_LENGTH = 80;
const COVER_VERSION_PAD = 4;
const COVER_VERSION_WRAP_AT = 10 ** COVER_VERSION_PAD;

const CONTENT_TYPE_PNG = "image/png";
const CONTENT_TYPE_WEBP = "image/webp";
const EXTENSION_JPG = ".jpg";
const EXTENSION_JPEG = ".jpeg";
const EXTENSION_PNG = ".png";
const EXTENSION_WEBP = ".webp";

const HTTP_PROTOCOL = "http:";
const HTTPS_PROTOCOL = "https:";

let coverVersionCounter = 0;

/**
 * Supported file extensions for saved cover images.
 */
export type CoverExtension = ".jpg" | ".png" | ".webp";

/**
 *
 * @param bookId
 */
function safeFileBase(bookId: string | undefined): string {
  const normalizedId = String(bookId ?? "").trim();
  const timestampFallback = `${COVER_FILE_FALLBACK_PREFIX}-${Date.now()}`;
  const rawValue = normalizedId || timestampFallback;
  const safe = rawValue
    .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, MAX_SAFE_FILE_BASE_LENGTH);
  return safe || timestampFallback;
}

/**
 *
 * @param userDataDir
 */
function ensureCoverDirectory(userDataDir: string): string {
  const coverDirectory = path.join(userDataDir, COVER_DIRECTORY_NAME);
  fs.mkdirSync(coverDirectory, { recursive: true });
  return coverDirectory;
}

/**
 * Resolves the normalized extension for a downloaded cover response.
 * @param contentType
 * @param parsedUrl
 */
export function extensionFor(
  contentType: string | null,
  parsedUrl: URL,
): CoverExtension {
  const normalizedContentType = String(contentType ?? "").toLowerCase();
  if (normalizedContentType.includes(CONTENT_TYPE_PNG)) {
    return EXTENSION_PNG;
  }
  if (normalizedContentType.includes(CONTENT_TYPE_WEBP)) {
    return EXTENSION_WEBP;
  }
  const knownExtension = path.extname(parsedUrl.pathname || "").toLowerCase();
  if (
    knownExtension === EXTENSION_PNG ||
    knownExtension === EXTENSION_WEBP ||
    knownExtension === EXTENSION_JPG
  ) {
    return knownExtension;
  }
  if (knownExtension === EXTENSION_JPEG) {
    return EXTENSION_JPG;
  }
  return EXTENSION_JPG;
}

/**
 * Returns true when the protocol is an allowed HTTP(S) protocol.
 * @param protocol
 */
export function isHttpProtocol(protocol: string): boolean {
  return protocol === HTTP_PROTOCOL || protocol === HTTPS_PROTOCOL;
}

/**
 * Builds a unique absolute file path for a cover image.
 * @param userDataDir
 * @param bookId
 * @param extension
 */
export function filePathForCover(
  userDataDir: string,
  bookId: string | undefined,
  extension: CoverExtension,
): string {
  const version = String(coverVersionCounter).padStart(COVER_VERSION_PAD, "0");
  coverVersionCounter = (coverVersionCounter + 1) % COVER_VERSION_WRAP_AT;
  const fileName = `${safeFileBase(bookId)}${COVER_FILE_VERSION_SEPARATOR}${Date.now()}${COVER_FILE_VERSION_SEPARATOR}${version}${extension}`;
  return path.join(ensureCoverDirectory(userDataDir), fileName);
}
