/**
 * Remote cover URL validation and bounded-download helpers.
 */
import { isIP } from "node:net";
import type { DownloadedCover } from "@reading-schedule/contracts";
import { bytesMatchCoverExtension } from "./cover-data-url.ts";
import { extensionFor, isHttpProtocol } from "./cover-paths.ts";

const LOCALHOST_HOSTNAME = "localhost";
const LOCALHOST_SUFFIX = ".localhost";
const LOCAL_NETWORK_SUFFIX = ".local";
const IPV6_HOSTNAME_PREFIX = "[";
const IPV6_HOSTNAME_SUFFIX = "]";
const BYTES_PER_KIBIBYTE = 1024;
const KIBIBYTES_PER_MEBIBYTE = 1024;
const MAX_REMOTE_COVER_MEBIBYTES = 5;
const MAX_REMOTE_COVER_BYTES =
    MAX_REMOTE_COVER_MEBIBYTES * KIBIBYTES_PER_MEBIBYTE * BYTES_PER_KIBIBYTE;
const MAX_REMOTE_COVER_REDIRECTS = 5;
const HTTP_STATUS_REDIRECT_MIN = 300;
const HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE = 400;

function normalizedHostname(hostname: string): string {
    const NORMALIZED = hostname.trim().toLowerCase().replace(/\.+$/, "");
    if (
        NORMALIZED.startsWith(IPV6_HOSTNAME_PREFIX) &&
        NORMALIZED.endsWith(IPV6_HOSTNAME_SUFFIX)
    ) {
        return NORMALIZED.slice(1, -1);
    }
    return NORMALIZED;
}

/**
 * Rejects loopback-style hostnames, local-network names, and all IP literals.
 */
function hasBlockedCoverHostname(hostname: string): boolean {
    const NORMALIZED = normalizedHostname(hostname);
    if (
        NORMALIZED === LOCALHOST_HOSTNAME ||
        NORMALIZED.endsWith(LOCALHOST_SUFFIX) ||
        NORMALIZED.endsWith(LOCAL_NETWORK_SUFFIX)
    ) {
        return true;
    }
    return isIP(NORMALIZED) !== 0;
}

function isRedirectStatus(status: number): boolean {
    return (
        status >= HTTP_STATUS_REDIRECT_MIN &&
        status < HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE
    );
}

function parsedUrlOrNull(urlText: string): URL | null {
    try {
        return new URL(urlText);
    } catch {
        return null;
    }
}

function hasBlockedCoverCredentials(parsedUrl: URL): boolean {
    return parsedUrl.username !== "" || parsedUrl.password !== "";
}

function hasBlockedCoverDestination(parsedUrl: URL): boolean {
    return (
        parsedUrl.port !== "" ||
        hasBlockedCoverCredentials(parsedUrl) ||
        hasBlockedCoverHostname(parsedUrl.hostname)
    );
}

function redirectedCoverUrlOrNull(
    location: string | null,
    baseUrl: URL,
): URL | null {
    if (location === null) {
        return null;
    }

    const NEXT_URL = parsedUrlOrNull(new URL(location, baseUrl).toString());
    if (NEXT_URL === null) {
        return null;
    }
    if (!isHttpProtocol(NEXT_URL.protocol)) {
        return null;
    }
    if (hasBlockedCoverDestination(NEXT_URL)) {
        return null;
    }

    return NEXT_URL;
}

/**
 * Parses a remote cover URL and rejects unsafe destinations.
 */
export function parsedHttpCoverUrl(urlText: string): URL | null {
    const PARSED_URL = parsedUrlOrNull(urlText);
    if (PARSED_URL === null) {
        return null;
    }
    if (!isHttpProtocol(PARSED_URL.protocol)) {
        return null;
    }
    if (hasBlockedCoverDestination(PARSED_URL)) {
        return null;
    }
    return PARSED_URL;
}

function parsedContentLength(response: Response): number | null {
    const CONTENT_LENGTH = Number(response.headers.get("content-length") ?? "");
    if (!Number.isFinite(CONTENT_LENGTH) || CONTENT_LENGTH <= 0) {
        return null;
    }
    return CONTENT_LENGTH;
}

function exceedsRemoteCoverLimit(byteLength: number): boolean {
    return byteLength > MAX_REMOTE_COVER_BYTES;
}

function combinedChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
    const COMBINED = new Uint8Array(totalBytes);
    let offset = 0;
    for (const CHUNK of chunks) {
        COMBINED.set(CHUNK, offset);
        offset += CHUNK.byteLength;
    }
    return COMBINED;
}

function bodyReaderOrNull(
    response: Response,
): ReadableStreamDefaultReader<Uint8Array> | null {
    const CONTENT_LENGTH = parsedContentLength(response);
    if (CONTENT_LENGTH !== null && exceedsRemoteCoverLimit(CONTENT_LENGTH)) {
        return null;
    }
    if (response.body === null) {
        return null;
    }

    return response.body.getReader();
}

function nextTotalBytes(totalBytes: number, chunk: Uint8Array): number {
    return totalBytes + chunk.byteLength;
}

async function readCoverChunks(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    chunks: Uint8Array[],
    totalBytes: number,
): Promise<number | null> {
    const RESULT = await reader.read();
    if (RESULT.done || RESULT.value === undefined) {
        return totalBytes;
    }
    const BYTES = RESULT.value;
    const NEXT_TOTAL = nextTotalBytes(totalBytes, BYTES);
    if (exceedsRemoteCoverLimit(NEXT_TOTAL)) {
        return null;
    }
    chunks.push(BYTES);
    return readCoverChunks(reader, chunks, NEXT_TOTAL);
}

/**
 * Reads response bytes while enforcing the remote cover size cap.
 */
async function downloadedCoverBytes(
    response: Response,
): Promise<Uint8Array | null> {
    const BODY_READER = bodyReaderOrNull(response);
    if (BODY_READER === null) {
        return null;
    }

    const CHUNKS: Uint8Array[] = [];
    let totalBytes: number | null;
    try {
        totalBytes = await readCoverChunks(BODY_READER, CHUNKS, 0);
    } finally {
        BODY_READER.releaseLock();
    }

    if (totalBytes === null || totalBytes === 0) {
        await response.body?.cancel();
        return null;
    }

    return combinedChunks(CHUNKS, totalBytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return Uint8Array.from(bytes).buffer;
}

async function fetchCoverResponseOnce(
    parsedUrl: URL,
): Promise<Response | null> {
    try {
        return await globalThis.fetch(parsedUrl.toString(), {
            redirect: "manual",
        });
    } catch {
        return null;
    }
}

async function fetchRedirectCoverResponse(
    response: Response,
    currentUrl: URL,
    remainingRedirects: number,
): Promise<{ parsedUrl: URL; response: Response } | null> {
    const NEXT_URL = redirectedCoverUrlOrNull(
        response.headers.get("location"),
        currentUrl,
    );
    await response.body?.cancel();
    if (NEXT_URL === null) {
        return null;
    }
    if (remainingRedirects === 0) {
        return null;
    }
    return fetchCoverResponseAt(NEXT_URL, remainingRedirects - 1);
}

async function fetchCoverResponseAt(
    currentUrl: URL,
    remainingRedirects: number,
): Promise<{ parsedUrl: URL; response: Response } | null> {
    const RESPONSE = await fetchCoverResponseOnce(currentUrl);
    if (RESPONSE === null) {
        return null;
    }
    if (isRedirectStatus(RESPONSE.status)) {
        return fetchRedirectCoverResponse(
            RESPONSE,
            currentUrl,
            remainingRedirects,
        );
    }
    if (!RESPONSE.ok) {
        await RESPONSE.body?.cancel();
        return null;
    }
    return {
        parsedUrl: currentUrl,
        response: RESPONSE,
    };
}

function fetchCoverResponse(
    parsedUrl: URL,
): Promise<{ parsedUrl: URL; response: Response } | null> {
    return fetchCoverResponseAt(parsedUrl, MAX_REMOTE_COVER_REDIRECTS);
}

/**
 * Downloads and validates a remote cover response before it reaches disk.
 */
export async function fetchRemoteCover(
    parsedUrl: URL,
): Promise<DownloadedCover | null> {
    const FETCHED_COVER = await fetchCoverResponse(parsedUrl);
    if (FETCHED_COVER === null) {
        return null;
    }

    const BYTES = await downloadedCoverBytes(FETCHED_COVER.response);
    if (BYTES === null) {
        return null;
    }

    const CONTENT_TYPE = FETCHED_COVER.response.headers.get("content-type");
    const EXTENSION = extensionFor(CONTENT_TYPE, FETCHED_COVER.parsedUrl);
    if (!bytesMatchCoverExtension(BYTES, EXTENSION)) {
        return null;
    }

    return {
        bytes: toArrayBuffer(BYTES),
        contentType: CONTENT_TYPE,
    };
}
