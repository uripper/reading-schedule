// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    addExistingBookKeys,
    authorMatches,
    normalizeLookupRecommendation,
    recommendationKey,
} from "../dist/renderer/recommendations/search_matchers.js";

test("recommendationKey normalizes casing and whitespace", () => {
    assert.equal(
        recommendationKey("  Persuasion  ", " Jane Austen "),
        "persuasion|jane austen",
    );
});

test("authorMatches accepts exact, prefix, and contained matches", () => {
    assert.equal(authorMatches("George Orwell", "george orwell"), true);
    assert.equal(authorMatches("George Orwell", "George"), true);
    assert.equal(authorMatches("Ursula K. Le Guin", "Le Guin"), true);
    assert.equal(authorMatches("George Orwell", "Jane Austen"), false);
});

test("normalizeLookupRecommendation fills fallback author and page estimate", () => {
    assert.deepEqual(
        normalizeLookupRecommendation(
            {
                author: "",
                cover_url: " https://covers.example/persuasion.png ",
                pages_estimate: 180,
                title: " Persuasion ",
            },
            "Jane Austen",
        ),
        {
            author: "Jane Austen",
            coverUrl: "https://covers.example/persuasion.png",
            title: "Persuasion",
            wordsTotal: 54000,
        },
    );
});

test("normalizeLookupRecommendation filters obvious non-book noise", () => {
    assert.equal(
        normalizeLookupRecommendation(
            {
                author: "Jane Austen",
                cover_url: "",
                title: "Conference Proceedings",
            },
            "Jane Austen",
        ),
        null,
    );
});

test("addExistingBookKeys deduplicates shelf book keys", () => {
    const KEYS = addExistingBookKeys([
        {
            author: "George Orwell",
            title: "Animal Farm",
        },
        {
            author: " george orwell ",
            title: " animal farm ",
        },
    ]);

    assert.equal(KEYS.size, 1);
    assert.equal(
        KEYS.has(recommendationKey("Animal Farm", "George Orwell")),
        true,
    );
});
