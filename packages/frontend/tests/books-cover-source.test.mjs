// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { bookCoverSrc } from "../dist/renderer/books/model-normalize.js";

test("bookCoverSrc falls back to the remote cover when local path is empty", () => {
    const COVER = bookCoverSrc({
        cover_local_path: "   ",
        cover_url: " https://covers.example/pride-and-prejudice.jpg ",
    });

    assert.equal(COVER, "https://covers.example/pride-and-prejudice.jpg");
});

test("bookCoverSrc prefers a non-empty local cover path", () => {
    const COVER = bookCoverSrc({
        cover_local_path: " /tmp/pride-and-prejudice.webp ",
        cover_url: "https://covers.example/pride-and-prejudice.jpg",
    });

    assert.equal(COVER, "/tmp/pride-and-prejudice.webp");
});
