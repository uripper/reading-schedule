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
    const userDataDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const result = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            userDataDirectory,
        );
        assert.ok(result.startsWith("file://"));

        const filePath = fileURLToPath(result);
        assert.ok(fs.existsSync(filePath));
        assert.equal(path.extname(filePath), ".png");
        assert.equal(path.basename(path.dirname(filePath)), COVER_DIRECTORY);
    } finally {
        fs.rmSync(userDataDirectory, { recursive: true, force: true });
    }
});

test("saveUploadedCover returns empty string for invalid input", () => {
    const { saveUploadedCover } = lookup;
    const userDataDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const result = saveUploadedCover(
            "not-a-data-url",
            "book-test",
            userDataDirectory,
        );
        assert.equal(result, "");
    } finally {
        fs.rmSync(userDataDirectory, { recursive: true, force: true });
    }
});

test("saveUploadedCover returns a new local path when replacing an existing cover", () => {
    const { saveUploadedCover } = lookup;
    const userDataDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), TEMP_DIRECTORY_PREFIX),
    );

    try {
        const first = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            userDataDirectory,
        );
        const second = saveUploadedCover(
            DATA_URL_PNG_1X1,
            "book-test",
            userDataDirectory,
        );

        assert.notEqual(first, second);
        assert.ok(fs.existsSync(fileURLToPath(first)));
        assert.ok(fs.existsSync(fileURLToPath(second)));
    } finally {
        fs.rmSync(userDataDirectory, { recursive: true, force: true });
    }
});
