/** Verifies release-notes scaffolding, validation, and publishable output. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    releaseNotesBody,
    releaseNotesPath,
    scaffoldReleaseNotes,
} from "./release-notes.mjs";

const VERSION = "9.9.9-test";

function temporaryRoot(context) {
    const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "release-notes-"));
    context.after(() => {
        fs.rmSync(ROOT, { force: true, recursive: true });
    });
    return ROOT;
}

test("notes live under changelog/<target>/<version>.md", () => {
    const NOTES_PATH = releaseNotesPath("desktop", VERSION, "/repo");
    assert.equal(
        NOTES_PATH,
        path.join("/repo", "changelog", "desktop", `${VERSION}.md`),
    );
});

test("unknown targets are rejected", () => {
    assert.throws(
        () => releaseNotesPath("tablet", VERSION, "/repo"),
        /desktop, website, mobile/,
    );
});

test("missing notes fail with the scaffold command", (context) => {
    const ROOT = temporaryRoot(context);
    assert.throws(
        () => releaseNotesBody("desktop", VERSION, ROOT),
        /scaffold desktop 9\.9\.9-test/,
    );
});

test("scaffolded drafts fail the check until filled in", (context) => {
    const ROOT = temporaryRoot(context);
    assert.equal(scaffoldReleaseNotes("desktop", VERSION, ROOT), true);
    assert.throws(
        () => releaseNotesBody("desktop", VERSION, ROOT),
        /still a draft/,
    );
});

test("scaffolding never overwrites written notes", (context) => {
    const ROOT = temporaryRoot(context);
    const NOTES_PATH = releaseNotesPath("mobile", VERSION, ROOT);
    fs.mkdirSync(path.dirname(NOTES_PATH), { recursive: true });
    fs.writeFileSync(NOTES_PATH, "## Fixes\n\n- Kept.\n");
    assert.equal(scaffoldReleaseNotes("mobile", VERSION, ROOT), false);
    assert.equal(fs.readFileSync(NOTES_PATH, "utf8"), "## Fixes\n\n- Kept.\n");
});

test("published body drops authoring comments and surrounding space", (context) => {
    const ROOT = temporaryRoot(context);
    const NOTES_PATH = releaseNotesPath("website", VERSION, ROOT);
    fs.mkdirSync(path.dirname(NOTES_PATH), { recursive: true });
    fs.writeFileSync(NOTES_PATH, "\n<!-- internal -->\n## New\n\n- Thing.\n\n");
    assert.equal(
        releaseNotesBody("website", VERSION, ROOT),
        "## New\n\n- Thing.",
    );
});

test("notes with only comments are empty", (context) => {
    const ROOT = temporaryRoot(context);
    const NOTES_PATH = releaseNotesPath("desktop", VERSION, ROOT);
    fs.mkdirSync(path.dirname(NOTES_PATH), { recursive: true });
    fs.writeFileSync(NOTES_PATH, "<!-- nothing yet -->\n");
    assert.throws(() => releaseNotesBody("desktop", VERSION, ROOT), /empty/);
});
