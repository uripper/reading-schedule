/**
 * Remote cover URL validation and bounded-download helpers.
 */
import { isIP } from "node:net";
import { Readable } from "node:stream";
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
const HTTP_STATUS_REDIRECT_MIN = 300;
const HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE = 400;

function normalizedHostname(hostname: string): string {
    const NORMALIZED = hostname.trim().toLowerCase();
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

function bodyStreamOrNull(response: Response): Readable | null {
    const CONTENT_LENGTH = parsedContentLength(response);
    if (CONTENT_LENGTH !== null && exceedsRemoteCoverLimit(CONTENT_LENGTH)) {
        return null;
    }
    if (response.body === null) {
        return null;
    }

    return Readable.fromWeb(response.body);
}

function nextTotalBytes(totalBytes: number, chunk: Uint8Array): number {
    return totalBytes + chunk.byteLength;
}

/**
 * Reads response bytes while enforcing the remote cover size cap.
 */
async function downloadedCoverBytes(
    response: Response,
): Promise<Uint8Array | null> {
    const BODY_STREAM = bodyStreamOrNull(response);
    if (BODY_STREAM === null) {
        return null;
    }

    const CHUNKS: Uint8Array[] = [];
    let totalBytes = 0;
    for await (const CHUNK of BODY_STREAM) {
        const BYTES = Uint8Array.from(CHUNK);
        totalBytes = nextTotalBytes(totalBytes, BYTES);
        if (exceedsRemoteCoverLimit(totalBytes)) {
            return null;
        }
        CHUNKS.push(BYTES);
    }

    if (totalBytes === 0) {
        return null;
    }

    return combinedChunks(CHUNKS, totalBytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    );
}

/**
 * Downloads and validates a remote cover response before it reaches disk.
 */
export async function fetchRemoteCover(
    parsedUrl: URL,
): Promise<DownloadedCover | null> {
    let response: Response;
    try {
        response = await globalThis.fetch(parsedUrl.toString(), {
            redirect: "manual",
        });
    } catch {
        return null;
    }

    if (isRedirectStatus(response.status) || !response.ok) {
        return null;
    }

    const BYTES = await downloadedCoverBytes(response);
    if (BYTES === null) {
        return null;
    }

    const CONTENT_TYPE = response.headers.get("content-type");
    const EXTENSION = extensionFor(CONTENT_TYPE, parsedUrl);
    if (!bytesMatchCoverExtension(BYTES, EXTENSION)) {
        return null;
    }

    return {
        bytes: toArrayBuffer(BYTES),
        contentType: CONTENT_TYPE,
    };
}
