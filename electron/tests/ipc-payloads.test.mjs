// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const { asDownloadCoverPayload, asUploadCoverPayload } = REQUIRE(
    "../dist/main/ipc_payloads.js",
);

test("asDownloadCoverPayload returns an empty object for nullish payloads", () => {
    assert.deepEqual(asDownloadCoverPayload(null), {});
});

test("asDownloadCoverPayload preserves only the expected download fields", () => {
    assert.deepEqual(
        asDownloadCoverPayload({
            bookId: "book-1",
            extra: "ignored",
            url: "https://example.test/cover.jpg",
        }),
        { bookId: "book-1", url: "https://example.test/cover.jpg" },
    );
});

test("asUploadCoverPayload returns an empty object for nullish payloads", () => {
    assert.deepEqual(asUploadCoverPayload(null), {});
});

test("asUploadCoverPayload preserves only the expected upload fields", () => {
    assert.deepEqual(
        asUploadCoverPayload({
            bookId: "book-2",
            dataUrl: "data:image/png;base64,abc",
            ignored: true,
        }),
        { bookId: "book-2", dataUrl: "data:image/png;base64,abc" },
    );
});
