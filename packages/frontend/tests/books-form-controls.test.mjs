/** Book form controls: grouped word counts and matched-text highlighting. */
import assert from "node:assert/strict";
import test from "node:test";

import { matchText } from "../dist/renderer/books/text_match.js";
import {
    formatWordCount,
    formatWordsInput,
    isValidWordCount,
    parseWordCount,
} from "../dist/renderer/books/word_count.js";

const LATIN = { numberingSystem: "latn" };
const GROUPED = new Intl.NumberFormat(undefined, LATIN).format(192000);

test("estimated words display with thousands separators", () => {
    assert.equal(formatWordCount(192000), GROUPED);
    assert.equal(formatWordCount(null), "");
});

test("estimated words are stored as a plain integer", () => {
    assert.equal(parseWordCount(GROUPED), 192000);
    assert.equal(parseWordCount("192,000"), 192000);
    assert.equal(parseWordCount("85000"), 85000);
    assert.equal(parseWordCount("  "), null);
});

test("estimated words reject signs, decimals, and stray characters", () => {
    for (const TEXT of ["-5", "+5", "1.5e3", "12abc", "1,,000", ",500"]) {
        assert.equal(isValidWordCount(TEXT), false, TEXT);
        assert.throws(() => parseWordCount(TEXT), /whole number/u);
    }
    assert.equal(isValidWordCount(""), true);
});

test("estimated words display with Latin digits", () => {
    assert.match(formatWordCount(1234567), /^[\d\s,.\u00a0\u202f']+$/u);
    assert.equal(parseWordCount(formatWordCount(1234567)), 1234567);
});

test("formatting leaves invalid text as typed", () => {
    const INPUT = { value: "-5" };
    formatWordsInput(INPUT);
    assert.equal(INPUT.value, "-5");
});

test("formatting the field keeps blank values blank", () => {
    const INPUT = { value: "85000" };
    formatWordsInput(INPUT);
    assert.equal(
        INPUT.value,
        new Intl.NumberFormat(undefined, LATIN).format(85000),
    );
    INPUT.value = "";
    formatWordsInput(INPUT);
    assert.equal(INPUT.value, "");
});

test("matchText maps folded hits back to the original characters", () => {
    assert.deepEqual(matchText("Les Misérables", "MISE"), {
        range: { end: 8, start: 4 },
        rank: 0,
    });
    assert.deepEqual(matchText("Gardening", "den"), {
        range: { end: 6, start: 3 },
        rank: 1,
    });
    assert.equal(matchText("Dune", "zz"), null);
    assert.equal(matchText("Dune", " "), null);
});
