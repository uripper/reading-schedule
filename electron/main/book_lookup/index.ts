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

const PRIVATE_NETWORK_HOSTNAME_PATTERN = /^172\.(1[6-9]|2\d|3[0-1])\./;

function normalizedCoverInput(value: string | undefined): string {
    return String(value ?? "").trim();
}

async function fetchedCoverResponse(parsedUrl: URL): Promise<Response | null> {
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
    return response;
}

async function downloadedCover(
    response: Response,
): Promise<DownloadedCover | null> {
    const BYTES = await response.arrayBuffer();
    if (BYTES.byteLength === 0) {
        return null;
    }
    return {
        bytes: BYTES,
        contentType: response.headers.get("content-type"),
    };
}

async function fetchCover(parsedUrl: URL): Promise<DownloadedCover | null> {
    const RESPONSE = await fetchedCoverResponse(parsedUrl);
    if (RESPONSE === null) {
        return null;
    }
    return downloadedCover(RESPONSE);
}

function parsedUrlOrNull(urlText: string): URL | null {
    try {
        return new URL(urlText);
    } catch {
        return null;
    }
}

/**
 * Checks whether a hostname is blocked from cover downloads.
 * This prevents downloading covers from localhost and common private network ranges.
 *
 * @param hostname - Hostname portion of a parsed URL.
 * @returns True when the hostname is considered private or loopback, otherwise false.
 */
function hasBlockedCoverHostname(hostname: string): boolean {
    return (
        hostname === "localhost" ||
        hostname === "::1" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        PRIVATE_NETWORK_HOSTNAME_PATTERN.test(hostname)
    );
}

function parsedHttpUrl(urlText: string): URL | null {
    const PARSED_URL = parsedUrlOrNull(urlText);
    if (PARSED_URL === null || !isHttpProtocol(PARSED_URL.protocol)) {
        return null;
    }
    if (hasBlockedCoverHostname(PARSED_URL.hostname.toLowerCase())) {
        return null;
    }
    return PARSED_URL;
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
