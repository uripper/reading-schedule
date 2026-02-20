import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export { searchBooks } from './book_lookup_search';

const COVER_DIRECTORY_NAME = 'book_covers';
const COVER_FILE_FALLBACK_PREFIX = 'cover';
const COVER_FILE_VERSION_SEPARATOR = '-';
const MAX_SAFE_FILE_BASE_LENGTH = 80;

const CONTENT_TYPE_PNG = 'image/png';
const CONTENT_TYPE_WEBP = 'image/webp';
const CONTENT_TYPE_JPEG = 'image/jpeg';
const CONTENT_TYPE_JPG = 'image/jpg';
const EXTENSION_JPG = '.jpg';
const EXTENSION_JPEG = '.jpeg';
const EXTENSION_PNG = '.png';
const EXTENSION_WEBP = '.webp';
const DATA_URL_PREFIX = 'data:';
const DATA_URL_SEPARATOR = ',';
const DATA_URL_BASE64_SEGMENT = ';base64';
const COVER_VERSION_PAD = 4;
const COVER_VERSION_WRAP_AT = 10 ** COVER_VERSION_PAD;

const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';

let coverVersionCounter = 0;

type CoverExtension = '.jpg' | '.png' | '.webp';

function extensionFor(contentType: string | null, parsedUrl: URL): CoverExtension {
  const normalizedContentType = String(contentType ?? '').toLowerCase();
  if (normalizedContentType.includes(CONTENT_TYPE_PNG)) {
    return EXTENSION_PNG;
  }
  if (normalizedContentType.includes(CONTENT_TYPE_WEBP)) {
    return EXTENSION_WEBP;
  }

  const knownExtension = path.extname(parsedUrl.pathname || '').toLowerCase();
  if (knownExtension === EXTENSION_PNG || knownExtension === EXTENSION_WEBP || knownExtension === EXTENSION_JPG) {
    return knownExtension;
  }
  if (knownExtension === EXTENSION_JPEG) {
    return EXTENSION_JPG;
  }
  return EXTENSION_JPG;
}

function safeFileBase(bookId: string | undefined): string {
  const normalizedId = String(bookId ?? '').trim();
  const timestampFallback = `${COVER_FILE_FALLBACK_PREFIX}-${Date.now()}`;
  const rawValue = normalizedId || timestampFallback;
  const safe = rawValue.replaceAll(/[^a-zA-Z0-9_-]/g, '_').slice(0, MAX_SAFE_FILE_BASE_LENGTH);
  return safe || timestampFallback;
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === HTTP_PROTOCOL || protocol === HTTPS_PROTOCOL;
}

function extensionForDataMime(mimeType: string): CoverExtension | null {
  const normalizedMime = String(mimeType || '').trim().toLowerCase();
  if (normalizedMime === CONTENT_TYPE_PNG) {
    return EXTENSION_PNG;
  }
  if (normalizedMime === CONTENT_TYPE_WEBP) {
    return EXTENSION_WEBP;
  }
  if (normalizedMime === CONTENT_TYPE_JPEG || normalizedMime === CONTENT_TYPE_JPG) {
    return EXTENSION_JPG;
  }
  return null;
}

function ensureCoverDirectory(userDataDir: string): string {
  const coverDirectory = path.join(userDataDir, COVER_DIRECTORY_NAME);
  fs.mkdirSync(coverDirectory, { recursive: true });
  return coverDirectory;
}

function filePathForCover(userDataDir: string, bookId: string | undefined, extension: CoverExtension): string {
  const version = String(coverVersionCounter).padStart(COVER_VERSION_PAD, '0');
  coverVersionCounter = (coverVersionCounter + 1) % COVER_VERSION_WRAP_AT;
  const fileName = `${safeFileBase(bookId)}${COVER_FILE_VERSION_SEPARATOR}${Date.now()}${COVER_FILE_VERSION_SEPARATOR}${version}${extension}`;
  return path.join(ensureCoverDirectory(userDataDir), fileName);
}

function parseCoverDataUrl(
  coverDataUrl: string | undefined,
): { bytes: Uint8Array; extension: CoverExtension } | null {
  const normalized = String(coverDataUrl || '').trim();
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

  const mimeType = header.split(';')[0];
  const extension = extensionForDataMime(mimeType);
  if (!extension) {
    return null;
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(payload, 'base64'));
  } catch {
    return null;
  }

  if (bytes.byteLength <= 0) {
    return null;
  }
  return { bytes, extension };
}

export async function downloadCover(
  coverUrl: string | undefined,
  bookId: string | undefined,
  userDataDir: string | undefined,
): Promise<string> {
  const normalizedUrl = String(coverUrl ?? '').trim();
  if (!normalizedUrl || !userDataDir) {
    return '';
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return '';
  }

  if (!isHttpProtocol(parsedUrl.protocol)) {
    return '';
  }

  let response: Response;
  try {
    response = await globalThis.fetch(parsedUrl.toString(), { redirect: 'follow' });
  } catch {
    return '';
  }

  if (!response.ok) {
    return '';
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) {
    return '';
  }

  const extension = extensionFor(response.headers.get('content-type'), parsedUrl);
  const filePath = filePathForCover(userDataDir, bookId, extension);
  fs.writeFileSync(filePath, new Uint8Array(bytes));
  return pathToFileURL(filePath).href;
}

export function saveUploadedCover(
  coverDataUrl: string | undefined,
  bookId: string | undefined,
  userDataDir: string | undefined,
): string {
  if (!userDataDir) {
    return '';
  }
  const parsed = parseCoverDataUrl(coverDataUrl);
  if (!parsed) {
    return '';
  }

  const filePath = filePathForCover(userDataDir, bookId, parsed.extension);
  fs.writeFileSync(filePath, parsed.bytes);
  return pathToFileURL(filePath).href;
}
