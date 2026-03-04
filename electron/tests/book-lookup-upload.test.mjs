import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as lookup from "../dist/book_lookup.js";

const DATA_URL_PNG_1X1 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2+3wAAAABJRU5ErkJggg==";
const TEMP_DIRECTORY_PREFIX = "bartleby-cover-upload-";
const COVER_DIRECTORY = "book_covers";

test("saveUploadedCover writes uploaded image to user data directory", () => {
    const { saveUploadedCover } = lookup;
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
    const { saveUploadedCover } = lookup;
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

test("saveUploadedCover returns a new local path when replacing an existing cover", () => {
    const { saveUploadedCover } = lookup;
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
