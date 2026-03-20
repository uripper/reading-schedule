/**
 * Book lookup and cover persistence helpers used by IPC handlers.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type {
    DownloadCoverInput,
    DownloadedCover,
} from "@reading-schedule/contracts";
import { parseCoverDataUrl } from "./cover-data-url.ts";
import { extensionFor, filePathForCover } from "./cover-paths.ts";
import { fetchRemoteCover, parsedHttpCoverUrl } from "./cover-remote.ts";

/**
 * Normalizes optional cover input text so validation can use one code path.
 */
function normalizedCoverInput(value: string | undefined): string {
    return String(value ?? "").trim();
}

/**
 * Fetches a remote cover image and converts it to persisted cover bytes.
 */
function fetchCover(parsedUrl: URL): Promise<DownloadedCover | null> {
    return fetchRemoteCover(parsedUrl);
}

/**
 * Validates the inputs needed to download and persist a remote cover image.
 */
function resolveDownloadCoverInput(
    coverUrl: string | undefined,
    userDataDir: string | undefined,
): DownloadCoverInput | null {
    const NORMALIZED_URL = normalizedCoverInput(coverUrl);
    const NORMALIZED_USER_DATA_DIR = normalizedCoverInput(userDataDir);

    if (NORMALIZED_URL.length === 0 || NORMALIZED_USER_DATA_DIR.length === 0) {
        return null;
    }

    const PARSED_URL = parsedHttpCoverUrl(NORMALIZED_URL);

    if (PARSED_URL === null) {
        return null;
    }

    return {
        parsedUrl: PARSED_URL,
        userDataDir: NORMALIZED_USER_DATA_DIR,
    };
}

/**
 * Writes a downloaded cover to disk and returns the resulting file URL.
 */
function persistDownloadedCover(
    input: DownloadCoverInput,
    bookId: string | undefined,
    cover: DownloadedCover,
): string {
    const EXTENSION = extensionFor(cover.contentType, input.parsedUrl);
    const FILE_PATH = filePathForCover(input.userDataDir, bookId, EXTENSION);
    writeFileSync(FILE_PATH, new Uint8Array(cover.bytes));
    return pathToFileURL(FILE_PATH).href;
}

/**
 * Downloads a remote cover image and stores it in the user data directory.
 * @param coverUrl - Remote cover URL candidate.
 * @param bookId - Book identifier used in generated file names.
 * @param userDataDir - App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when download fails.
 */
export async function downloadCover(
    coverUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
): Promise<string> {
    const DOWNLOAD_INPUT = resolveDownloadCoverInput(coverUrl, userDataDir);
    if (DOWNLOAD_INPUT === null) {
        return "";
    }
    const DOWNLOADED_COVER = await fetchCover(DOWNLOAD_INPUT.parsedUrl);
    if (DOWNLOADED_COVER === null) {
        return "";
    }
    return persistDownloadedCover(DOWNLOAD_INPUT, bookId, DOWNLOADED_COVER);
}

/**
 * Writes a parsed uploaded cover payload to disk and returns its file URL.
 */
function persistUploadedCover(
    userDataDir: string,
    bookId: string | undefined,
    parsedCover: NonNullable<ReturnType<typeof parseCoverDataUrl>>,
): string {
    const FILE_PATH = filePathForCover(
        userDataDir,
        bookId,
        parsedCover.extension,
    );
    writeFileSync(FILE_PATH, parsedCover.bytes);
    return pathToFileURL(FILE_PATH).href;
}

/**
 * Persists a user-uploaded cover data URL to disk and returns a file URL.
 * @param coverDataUrl - Base64 image data URL from upload UI.
 * @param bookId - Book identifier used in generated file names.
 * @param userDataDir - App user-data directory where cover files are saved.
 * @returns File URL for the persisted cover, or empty string when parsing fails.
 */
export function saveUploadedCover(
    coverDataUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
): string {
    const NORMALIZED_USER_DATA_DIR = String(userDataDir ?? "").trim();
    const PARSED = parseCoverDataUrl(coverDataUrl);
    if (NORMALIZED_USER_DATA_DIR.length === 0 || PARSED === null) {
        return "";
    }
    return persistUploadedCover(NORMALIZED_USER_DATA_DIR, bookId, PARSED);
}
