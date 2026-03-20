// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const Require = createRequire(import.meta.url);
const Lookup = Require("../dist/main/book_lookup/index.js");

const DATA_URL_PNG_1X1 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2+3wAAAABJRU5ErkJggg==";
const DATA_URL_INVALID_BASE64 = "data:image/png;base64,@@@@";
const JPEG_HEADER_AS_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString(
    "base64",
);
const DATA_URL_PNG_WITH_JPEG_BYTES = `data:image/png;base64,${JPEG_HEADER_AS_BASE64}`;
const TEMP_DIRECTORY_PREFIX = "bartleby-cover-upload-";
const COVER_DIRECTORY = "book_covers";

test("saveUploadedCover writes uploaded image to user data directory", () => {
    const { saveUploadedCover } = Lookup;
    const USER_DATA_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const RESULT = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            USER_DATA_DIRECTORY,
        );
        assert.ok(RESULT.startsWith("file://"));

        const FILE_PATH = fileURLToPath(RESULT);
        assert.ok(fs.existsSync(FILE_PATH));
        assert.equal(path.extname(FILE_PATH), ".png");
        assert.equal(path.basename(path.dirname(FILE_PATH)), COVER_DIRECTORY);
    } finally {
        fs.rmSync(USER_DATA_DIRECTORY, { force: true, recursive: true });
    }
});

test("saveUploadedCover returns empty string for invalid input", () => {
    const { saveUploadedCover } = Lookup;
    const USER_DATA_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const RESULT = saveUploadedCover(
            "not-a-data-url",
            "book-test",
            USER_DATA_DIRECTORY,
        );
        assert.equal(RESULT, "");
    } finally {
        fs.rmSync(USER_DATA_DIRECTORY, { force: true, recursive: true });
    }
});

test("saveUploadedCover rejects invalid base64 payloads", () => {
    const { saveUploadedCover } = Lookup;
    const USER_DATA_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const RESULT = saveUploadedCover(
            DATA_URL_INVALID_BASE64,
            "book-test",
            USER_DATA_DIRECTORY,
        );
        assert.equal(RESULT, "");
    } finally {
        fs.rmSync(USER_DATA_DIRECTORY, { force: true, recursive: true });
    }
});

test("saveUploadedCover rejects payloads whose bytes do not match the image type", () => {
    const { saveUploadedCover } = Lookup;
    const USER_DATA_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const RESULT = saveUploadedCover(
            DATA_URL_PNG_WITH_JPEG_BYTES,
            "book-test",
            USER_DATA_DIRECTORY,
        );
        assert.equal(RESULT, "");
    } finally {
        fs.rmSync(USER_DATA_DIRECTORY, { force: true, recursive: true });
    }
});

test("saveUploadedCover returns a new local path when replacing an existing cover", () => {
    const { saveUploadedCover } = Lookup;
    const USER_DATA_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const FIRST = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            USER_DATA_DIRECTORY,
        );
        const SECOND = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            USER_DATA_DIRECTORY,
        );

        assert.notEqual(FIRST, SECOND);
        assert.ok(fs.existsSync(fileURLToPath(FIRST)));
        assert.ok(fs.existsSync(fileURLToPath(SECOND)));
    } finally {
        fs.rmSync(USER_DATA_DIRECTORY, { force: true, recursive: true });
    }
});
