// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    parsePlanGeneratePayload,
    parsePlanGenerateResult,
    parseSamplePayload,
} from "../../packages/contracts/dist/planner.js";

test("planner payload parser accepts valid generate payload", () => {
    const PAYLOAD = parsePlanGeneratePayload({
        books: [{ book_id: "book-1", title: "Sample" }],
        planner: "mip",
        settings: {
            days_off: ["Mon"],
            minutes_by_weekday: {
                Fri: 10,
                Mon: 10,
                Sat: 10,
                Sun: 10,
                Thu: 10,
                Tue: 10,
                Wed: 10,
            },
            start_date: "2026-01-01",
        },
    });

    assert.equal(PAYLOAD.planner, "mip");
    assert.equal(PAYLOAD.books.length, 1);
});

test("planner payload parser accepts profile planner token", () => {
    const PAYLOAD = parsePlanGeneratePayload({
        books: [{ book_id: "book-1", title: "Sample" }],
        planner: "mip-fast",
        settings: {
            start_date: "2026-01-01",
        },
    });

    assert.equal(PAYLOAD.planner, "mip-fast");
});

test("planner payload parser rejects invalid planner type", () => {
    assert.throws(
        () =>
            parsePlanGeneratePayload({
                books: [],
                planner: "unknown",
                settings: {},
            }),
        /Planner generate payload validation failed/i,
    );
});

test("planner response parser rejects malformed schedule rows", () => {
    assert.throws(
        () =>
            parsePlanGenerateResult({
                schedule: [{ date: "2026-01-01" }],
                summary: null,
            }),
        /Planner generate response validation failed/i,
    );
});

test("planner sample parser rejects invalid settings shape", () => {
    assert.throws(
        () =>
            parseSamplePayload({
                books: [],
                settings: {
                    days_off: ["NotAWeekday"],
                },
            }),
        /Planner sample response validation failed/i,
    );
});
