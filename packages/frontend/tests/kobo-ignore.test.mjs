// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers lasting exclusions, cancellation, and failed exclusion saves. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePreferences } from "../dist/renderer/app/experience/model.js";
import {
    ignoreKoboRecord,
    visibleKoboRecords,
} from "../dist/renderer/kobo/ignored.js";
import { toKoboSyncRecord } from "../dist/renderer/kobo/records.js";

const RECORD = {
    contentId: "device-book",
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 20,
    title: "Unwanted book",
};
const SYNC_RECORD = toKoboSyncRecord(RECORD, "N418");

function context() {
    return {
        persistDraft: async () => {
            await Promise.resolve();
            return true;
        },
        state: { preferences: normalizePreferences() },
    };
}

async function confirmIgnore() {
    await Promise.resolve();
    return true;
}

test("confirmed ignore persists by source ID and survives preference reload", async () => {
    const CONTEXT = context();
    assert.equal(
        await ignoreKoboRecord(CONTEXT, SYNC_RECORD, confirmIgnore),
        true,
    );
    const RELOADED = normalizePreferences(
        JSON.parse(JSON.stringify(CONTEXT.state.preferences)),
    );
    const UPDATED = {
        ...RECORD,
        dateLastRead: "2026-03-01T12:00:00Z",
        percentRead: 80,
        title: "Renamed",
    };
    assert.equal(visibleKoboRecords([UPDATED], RELOADED).length, 0);
    assert.equal(
        visibleKoboRecords([{ ...RECORD, contentId: "different" }], RELOADED)
            .length,
        1,
    );
});

test("cancel leaves the source visible and saves nothing", async () => {
    const CONTEXT = context();
    const CANCEL = async () => {
        await Promise.resolve();
        return false;
    };
    assert.equal(await ignoreKoboRecord(CONTEXT, SYNC_RECORD, CANCEL), false);
    assert.equal(CONTEXT.state.preferences.koboIgnoredContentIds, undefined);
    assert.equal(
        visibleKoboRecords([RECORD], CONTEXT.state.preferences).length,
        1,
    );
});

test("failed saves restore the previous ignored list", async () => {
    const CONTEXT = context();
    CONTEXT.state.preferences.koboIgnoredContentIds = ["previous"];
    CONTEXT.persistDraft = async () => {
        await Promise.resolve();
        return false;
    };
    await assert.rejects(
        ignoreKoboRecord(CONTEXT, SYNC_RECORD, confirmIgnore),
        /retry/,
    );
    assert.deepEqual(CONTEXT.state.preferences.koboIgnoredContentIds, [
        "previous",
    ]);
    assert.equal(
        visibleKoboRecords([RECORD], CONTEXT.state.preferences).length,
        1,
    );
});

test("repeat confirmations do not duplicate excluded source IDs", async () => {
    const CONTEXT = context();
    await ignoreKoboRecord(CONTEXT, SYNC_RECORD, confirmIgnore);
    await ignoreKoboRecord(CONTEXT, SYNC_RECORD, confirmIgnore);
    assert.deepEqual(CONTEXT.state.preferences.koboIgnoredContentIds, [
        RECORD.contentId,
    ]);
});
