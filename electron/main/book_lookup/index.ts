/**
 * @file Book lookup and cover persistence helpers used by IPC handlers.
 */
import * as fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCoverDataUrl } from "./cover_data_url";
import { extensionFor, filePathForCover, isHttpProtocol } from "./cover_paths";

export { searchBooks } from "./search";

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
    const NORMALIZED_URL = String(coverUrl ?? "").trim();
    const NORMALIZED_USER_DATA_DIR = String(userDataDir ?? "").trim();
    if (NORMALIZED_URL.length === 0 || NORMALIZED_USER_DATA_DIR.length === 0) {
        return "";
    }
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(NORMALIZED_URL);
    } catch {
        return "";
    }
    if (!isHttpProtocol(parsedUrl.protocol)) {
        return "";
    }
    let response: Response;
    try {
        response = await globalThis.fetch(parsedUrl.toString(), {
            redirect: "follow",
        });
    } catch {
        return "";
    }
    if (!response.ok) {
        return "";
    }
    const BYTES = await response.arrayBuffer();
    if (BYTES.byteLength === 0) {
        return "";
    }
    const EXTENSION = extensionFor(
        response.headers.get("content-type"),
        parsedUrl,
    );
    const FILE_PATH = filePathForCover(
        NORMALIZED_USER_DATA_DIR,
        bookId,
        EXTENSION,
    );
    fs.writeFileSync(FILE_PATH, new Uint8Array(BYTES));
    return pathToFileURL(FILE_PATH).href;
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
    const NORMALIZED_USER_DATA_DIR = String(userDataDir ?? "").trim();
    if (NORMALIZED_USER_DATA_DIR.length === 0) {
        return "";
    }
    const PARSED = parseCoverDataUrl(coverDataUrl);
    if (!PARSED) {
        return "";
    }
    const FILE_PATH = filePathForCover(
        NORMALIZED_USER_DATA_DIR,
        bookId,
        PARSED.extension,
    );
    fs.writeFileSync(FILE_PATH, PARSED.bytes);
    return pathToFileURL(FILE_PATH).href;
}
