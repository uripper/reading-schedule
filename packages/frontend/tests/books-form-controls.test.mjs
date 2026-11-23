/** Book form controls: grouped word counts and matched-text highlighting. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    formatWordCount,
    formatWordsInput,
    parseWordCount,
} from "../dist/renderer/books/form_controls.js";
import { matchText } from "../dist/renderer/books/text_match.js";

const GROUPED = new Intl.NumberFormat().format(192000);

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

test("formatting the field keeps blank values blank", () => {
    const INPUT = { value: "85000" };
    formatWordsInput(INPUT);
    assert.equal(INPUT.value, new Intl.NumberFormat().format(85000));
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
