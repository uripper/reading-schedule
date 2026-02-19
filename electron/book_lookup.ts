import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export { searchBooks } from './book_lookup_search';

const COVER_DIRECTORY_NAME = 'book_covers';
const COVER_FILE_FALLBACK_PREFIX = 'cover';
const MAX_SAFE_FILE_BASE_LENGTH = 80;

const CONTENT_TYPE_PNG = 'image/png';
const CONTENT_TYPE_WEBP = 'image/webp';
const EXTENSION_JPG = '.jpg';
const EXTENSION_JPEG = '.jpeg';
const EXTENSION_PNG = '.png';
const EXTENSION_WEBP = '.webp';

const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';

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
  const coverDirectory = path.join(userDataDir, COVER_DIRECTORY_NAME);
  fs.mkdirSync(coverDirectory, { recursive: true });

  const fileName = `${safeFileBase(bookId)}${extension}`;
  const filePath = path.join(coverDirectory, fileName);
  fs.writeFileSync(filePath, new Uint8Array(bytes));
  return pathToFileURL(filePath).href;
}
