import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { readState } from "../dist/main/state_store.js";
import { writeStateToJson } from "../dist/main/state_store_json.js";
import { sqliteStatePath } from "../dist/main/state_store_paths.js";

/**
 * Creates isolated temp user-data directory for persistence tests.
 * @returns {string} Temporary directory path.
 */
function tempUserDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-migration-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param {string} directory Temporary directory path.
 */
function cleanup(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

test("Facade reads JSON fallback once, migrates to SQLite, then reads SQLite", () => {
  const userDataDir = tempUserDataDir();
  try {
    const seed = {
      settings: { start_date: "2026-03-01" },
      books: [{ book_id: "book-1", title: "Migrated" }],
    };
    assert.equal(writeStateToJson(userDataDir, seed).ok, true);

    const firstRead = readState(userDataDir);
    assert.equal(firstRead.source, "json_primary");
    assert.equal(firstRead.warningCode, "MIGRATED_JSON_TO_SQLITE");
    assert.equal(firstRead.state?.settings?.start_date, "2026-03-01");

    assert.equal(fs.existsSync(sqliteStatePath(userDataDir)), true);

    const secondRead = readState(userDataDir);
    assert.equal(secondRead.source, "sqlite");
    assert.equal(secondRead.state?.settings?.start_date, "2026-03-01");
  } finally {
    cleanup(userDataDir);
  }
});
