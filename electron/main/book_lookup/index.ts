/**
 * Book lookup and cover persistence helpers used by IPC handlers.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCoverDataUrl } from "./cover-data-url.ts";
import {
    extensionFor,
    filePathForCover,
    isHttpProtocol,
} from "./cover-paths.ts";

interface DownloadedCover {
    bytes: ArrayBuffer;
    contentType: string | null;
}

interface DownloadCoverInput {
    parsedUrl: URL;
    userDataDir: string;
}

function normalizedCoverInput(value: string | undefined): string {
    return String(value ?? "").trim();
}

async function fetchCover(parsedUrl: URL): Promise<DownloadedCover | null> {
    let response: Response;

    try {
        response = await globalThis.fetch(parsedUrl.toString(), {
            redirect: "follow",
        });
    } catch {
        return null;
    }

    if (!response.ok) {
        return null;
    }

    const BYTES = await response.arrayBuffer();

    if (BYTES.byteLength === 0) {
        return null;
    }

    return {
        bytes: BYTES,
        contentType: response.headers.get("content-type"),
    };
}

function parsedHttpUrl(urlText: string): URL | null {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(urlText);
    } catch {
        return null;
    }

    if (!isHttpProtocol(parsedUrl.protocol)) {
        return null;
    }

    return parsedUrl;
}

function resolveDownloadCoverInput(
    coverUrl: string | undefined,
    userDataDir: string | undefined,
): DownloadCoverInput | null {
    const NORMALIZED_URL = normalizedCoverInput(coverUrl);
    const NORMALIZED_USER_DATA_DIR = normalizedCoverInput(userDataDir);

    if (NORMALIZED_URL.length === 0 || NORMALIZED_USER_DATA_DIR.length === 0) {
        return null;
    }

    const PARSED_URL = parsedHttpUrl(NORMALIZED_URL);

    if (PARSED_URL === null) {
        return null;
    }

    return {
        parsedUrl: PARSED_URL,
        userDataDir: NORMALIZED_USER_DATA_DIR,
    };
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

    const EXTENSION = extensionFor(
        DOWNLOADED_COVER.contentType,
        DOWNLOAD_INPUT.parsedUrl,
    );
    const FILE_PATH = filePathForCover(
        DOWNLOAD_INPUT.userDataDir,
        bookId,
        EXTENSION,
    );
    writeFileSync(FILE_PATH, new Uint8Array(DOWNLOADED_COVER.bytes));
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
    writeFileSync(FILE_PATH, PARSED.bytes);
    return pathToFileURL(FILE_PATH).href;
}
