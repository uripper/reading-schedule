/**
 * @file Book lookup and cover persistence helpers used by IPC handlers.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

import {
  extensionFor,
  filePathForCover,
  isHttpProtocol,
} from "./book_lookup_cover_paths";
import { parseCoverDataUrl } from "./book_lookup_cover_data_url";

export { searchBooks } from "./book_lookup_search";

/**
 * Downloads a remote cover image and stores it in the user data directory.
 * @param coverUrl Remote cover URL candidate.
 * @param bookId Book identifier used in generated file names.
 * @param userDataDir App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when download fails.
 */
export async function downloadCover(
  coverUrl: string | undefined,
  bookId: string | undefined,
  userDataDir: string | undefined,
): Promise<string> {
  const normalizedUrl = String(coverUrl ?? "").trim();
  if (!normalizedUrl || !userDataDir) {
    return "";
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return "";
  }
  if (!isHttpProtocol(parsedUrl.protocol)) {
    return "";
  }
  let response: Response;
  try {
    response = await globalThis.fetch(parsedUrl.toString(), { redirect: "follow" });
  } catch {
    return "";
  }
  if (!response.ok) {
    return "";
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) {
    return "";
  }
  const extension = extensionFor(response.headers.get("content-type"), parsedUrl);
  const filePath = filePathForCover(userDataDir, bookId, extension);
  fs.writeFileSync(filePath, new Uint8Array(bytes));
  return pathToFileURL(filePath).href;
}

/**
 * Persists a user-uploaded cover data URL to disk and returns a file URL.
 * @param coverDataUrl Base64 image data URL from upload UI.
 * @param bookId Book identifier used in generated file names.
 * @param userDataDir App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when parsing fails.
 */
export function saveUploadedCover(
  coverDataUrl: string | undefined,
  bookId: string | undefined,
  userDataDir: string | undefined,
): string {
  if (!userDataDir) {
    return "";
  }
  const parsed = parseCoverDataUrl(coverDataUrl);
  if (!parsed) {
    return "";
  }
  const filePath = filePathForCover(userDataDir, bookId, parsed.extension);
  fs.writeFileSync(filePath, parsed.bytes);
  return pathToFileURL(filePath).href;
}
