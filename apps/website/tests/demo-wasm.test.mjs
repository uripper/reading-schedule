/** Executes the actual browser binary and compares it with the native core. */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import initPlanner, {
    generate_plan_json as generatePlanJson,
} from "../../../packages/planner/dist/bartleby_planner.js";

const ROOT = new URL("../../../", import.meta.url);
const SETTINGS = JSON.parse(
    fs.readFileSync(new URL("data/settings.json", ROOT), "utf8"),
);
const BOOKS = JSON.parse(
    fs.readFileSync(new URL("data/books.sample.json", ROOT), "utf8"),
);
const WASM = fs.readFileSync(
    new URL("packages/planner/dist/bartleby_planner_bg.wasm", ROOT),
);
await initPlanner({ module_or_path: WASM });

/** Runs the platform-independent native fixture entrypoint on the same JSON. */
function nativeResult(payload) {
    const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), "bartleby-parity-"));
    const FIXTURE = path.join(TEMP, "input.json");
    fs.writeFileSync(FIXTURE, JSON.stringify(payload));
    try {
        return runNativeFixture(FIXTURE);
    } finally {
        fs.rmSync(TEMP, { force: true, recursive: true });
    }
}

/** Invokes the fixture runner with a bounded lifetime. */
function runNativeFixture(fixture) {
    const RESULT = spawnSync(
        "cargo",
        [
            "run",
            "--quiet",
            "--locked",
            "--manifest-path",
            "packages/planner/Cargo.toml",
            "--bin",
            "planner_fixture",
            "--",
            fixture,
        ],
        { cwd: fileURLToPath(ROOT), encoding: "utf8", timeout: 60_000 },
    );
    assert.equal(RESULT.status, 0, RESULT.stderr ?? RESULT.error?.message);
    return JSON.parse(RESULT.stdout);
}

/** Removes platform-dependent timing before comparing the complete output. */
function withoutTiming(result) {
    delete result.summary.timings_ms;
    return result;
}

test("WebAssembly and native builds produce identical schedules and summaries", () => {
    const PAYLOAD = { books: BOOKS, settings: SETTINGS };
    const BROWSER = JSON.parse(generatePlanJson(JSON.stringify(PAYLOAD)));
    assert.deepEqual(
        withoutTiming(BROWSER),
        withoutTiming(nativeResult(PAYLOAD)),
    );
    assert.ok(BROWSER.schedule.length > 0);
});

test("editing reading budgets regenerates a different schedule with native parity", () => {
    const PAYLOAD = {
        books: BOOKS,
        settings: { ...SETTINGS, minutes_by_weekday: {}, minutes_per_day: 120 },
    };
    const BROWSER = JSON.parse(generatePlanJson(JSON.stringify(PAYLOAD)));
    const ORIGINAL = JSON.parse(
        generatePlanJson(JSON.stringify({ books: BOOKS, settings: SETTINGS })),
    );
    assert.notDeepEqual(BROWSER.schedule, ORIGINAL.schedule);
    assert.deepEqual(
        withoutTiming(BROWSER),
        withoutTiming(nativeResult(PAYLOAD)),
    );
});

test("WebAssembly validates malformed JSON and invalid planner settings", () => {
    assert.throws(() => generatePlanJson("{"));
    const PAYLOAD = {
        books: BOOKS,
        settings: { ...SETTINGS, end_date: "2020-01-01" },
    };
    assert.throws(() => generatePlanJson(JSON.stringify(PAYLOAD)));
});

test("WebAssembly can generate missing book IDs using browser-compatible randomness", () => {
    const BOOK = { ...BOOKS[0], blocked_by: null, book_id: null };
    const RESULT = JSON.parse(
        generatePlanJson(JSON.stringify({ books: [BOOK], settings: SETTINGS })),
    );
    assert.ok(RESULT.schedule.length > 0);
});
