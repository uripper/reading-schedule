// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const Require = createRequire(import.meta.url);
const { downloadCover } = Require("../dist/main/book_lookup/index.js");
const { searchBooks } = Require("../dist/main/book_lookup/search.js");
const { scoreDoc } = Require("../dist/main/book_lookup/search-scoring.js");

const PNG_1X1_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2+3wAAAABJRU5ErkJggg==";
const PNG_1X1_BYTES = Uint8Array.from(Buffer.from(PNG_1X1_BASE64, "base64"));
const JPEG_1X1_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const TEMP_DIRECTORY_PREFIX = "bartleby-cover-download-";
const COVER_DIRECTORY = "book_covers";
const OVERSIZED_CONTENT_LENGTH_BYTES = String(6 * 1024 * 1024);
const OPEN_LIBRARY_COVER_URL =
    "https://covers.openlibrary.org/b/id/12547191-L.jpg";
const OPEN_LIBRARY_REDIRECT_URL =
    "https://archive.org/download/l_covers_0012/l_covers_0012_54.zip/0012547191-L.jpg";

function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX));
}

function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

async function withTempUserDataDirectory(work) {
    const USER_DATA_DIRECTORY = tempUserDataDir();
    try {
        await work(USER_DATA_DIRECTORY);
    } finally {
        cleanup(USER_DATA_DIRECTORY);
    }
}

async function withMockedFetch(fetchImpl, work) {
    const ORIGINAL_FETCH = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
        await work();
    } finally {
        globalThis.fetch = ORIGINAL_FETCH;
    }
}

function pngResponse(headers = {}) {
    return new Response(PNG_1X1_BYTES, {
        headers: {
            "content-length": String(PNG_1X1_BYTES.byteLength),
            "content-type": "image/png",
            ...headers,
        },
        status: 200,
    });
}

function jpegResponse(headers = {}) {
    return new Response(JPEG_1X1_BYTES, {
        headers: {
            "content-length": String(JPEG_1X1_BYTES.byteLength),
            "content-type": "image/jpeg",
            ...headers,
        },
        status: 200,
    });
}

function assertSavedCover(result, extension) {
    assert.ok(result.startsWith("file://"));
    const FILE_PATH = fileURLToPath(result);
    assert.ok(fs.existsSync(FILE_PATH));
    assert.equal(path.extname(FILE_PATH), extension);
    assert.equal(path.basename(path.dirname(FILE_PATH)), COVER_DIRECTORY);
}

function assertSavedPngCover(result) {
    assertSavedCover(result, ".png");
}

function assertSavedJpegCover(result) {
    assertSavedCover(result, ".jpg");
}

async function assertRejectedDownload(coverUrl, userDataDirectory) {
    assert.equal(
        await downloadCover(coverUrl, "book-test", userDataDirectory),
        "",
    );
}

function blockedHostFetch() {
    let callCount = 0;

    return {
        fetchImpl() {
            callCount += 1;
            return pngResponse();
        },
        getCalls() {
            return callCount;
        },
    };
}

function redirectThenOversizedFetch() {
    let callCount = 0;

    return {
        fetchImpl() {
            callCount += 1;
            if (callCount === 1) {
                return new Response(null, {
                    headers: {
                        location: "https://internal.example.com/cover.png",
                    },
                    status: 302,
                });
            }

            return pngResponse({
                "content-length": OVERSIZED_CONTENT_LENGTH_BYTES,
            });
        },
    };
}

function openLibraryRedirectFetch() {
    const REQUEST_URLS = [];

    return {
        fetchImpl(requestUrl) {
            REQUEST_URLS.push(requestUrl);

            if (REQUEST_URLS.length === 1) {
                return new Response(null, {
                    headers: {
                        location: OPEN_LIBRARY_REDIRECT_URL,
                    },
                    status: 302,
                });
            }

            return jpegResponse();
        },
        getRequestUrls() {
            return REQUEST_URLS;
        },
    };
}

test("downloadCover saves a validated remote image", async () => {
    await withMockedFetch(
        () => pngResponse(),
        async () => {
            await withTempUserDataDirectory(async (userDataDirectory) => {
                const RESULT = await downloadCover(
                    "https://covers.example.com/cover.png",
                    "book-test",
                    userDataDirectory,
                );
                assertSavedPngCover(RESULT);
            });
        },
    );
});

test("downloadCover follows the OpenLibrary cover redirect chain", async () => {
    const FETCH = openLibraryRedirectFetch();

    await withMockedFetch(FETCH.fetchImpl, async () => {
        await withTempUserDataDirectory(async (userDataDirectory) => {
            const RESULT = await downloadCover(
                OPEN_LIBRARY_COVER_URL,
                "book-test",
                userDataDirectory,
            );
            assertSavedJpegCover(RESULT);
            assert.deepEqual(FETCH.getRequestUrls(), [
                OPEN_LIBRARY_COVER_URL,
                OPEN_LIBRARY_REDIRECT_URL,
            ]);
        });
    });
});

test("downloadCover rejects blocked hosts and explicit ports before fetching", async () => {
    const FETCH = blockedHostFetch();

    await withMockedFetch(FETCH.fetchImpl, async () => {
        await withTempUserDataDirectory(async (userDataDirectory) => {
            await assertRejectedDownload(
                "http://127.0.0.1/cover.png",
                userDataDirectory,
            );
            await assertRejectedDownload(
                "https://covers.example.com:8443/cover.png",
                userDataDirectory,
            );
            assert.equal(FETCH.getCalls(), 0);
        });
    });
});

test("downloadCover rejects redirects and oversized responses", async () => {
    const FETCH = redirectThenOversizedFetch();

    await withMockedFetch(FETCH.fetchImpl, async () => {
        await withTempUserDataDirectory(async (userDataDirectory) => {
            await assertRejectedDownload(
                "https://covers.example.com/redirect.png",
                userDataDirectory,
            );
            await assertRejectedDownload(
                "https://covers.example.com/large.png",
                userDataDirectory,
            );
        });
    });
});

test("searchBooks ignores malformed docs arrays instead of treating them as SearchDoc", async () => {
    await withMockedFetch(
        async () =>
            new Response(JSON.stringify({ docs: ["bad-doc", 42, null] }), {
                headers: { "content-type": "application/json" },
                status: 200,
            }),
        async () => {
            const RESULTS = await searchBooks("orwell", false);
            assert.deepEqual(RESULTS, []);
        },
    );
});

test("scoreDoc keeps author-token matches when a result has no title", () => {
    const SCORE = scoreDoc(
        {
            author_name: ["George Orwell"],
            edition_count: 3,
            language: ["eng"],
        },
        "George Orwell",
        false,
    );

    assert.ok(SCORE > 0);
});
