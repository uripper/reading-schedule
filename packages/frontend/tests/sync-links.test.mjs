// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers per-device source links and provider-neutral review behavior. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareSyncImport } from "../dist/renderer/sync/import.js";
import {
    syncProviderLabel,
    syncSourceLabel,
    withoutSyncLink,
    withSyncLink,
} from "../dist/renderer/sync/links.js";
import { matchSyncRecord } from "../dist/renderer/sync/matching.js";
import {
    actionableSyncEntries,
    assessSyncProgress,
    syncReviewEntries,
} from "../dist/renderer/sync/model.js";
import { syncReviewConflicts } from "../dist/renderer/sync/review-conflicts.js";

const FIRST = {
    dateLastRead: "2026-02-01T12:00:00Z",
    deviceId: "N418A",
    percentRead: 40,
    provider: "kobo",
    sourceId: "book",
    title: "Book",
};
const SECOND = {
    ...FIRST,
    dateLastRead: "2026-02-03T12:00:00Z",
    deviceId: "N418B",
    percentRead: 60,
};

function linkedBook(links) {
    return normalizeBook({
        book_id: "book",
        progress_percent: 40,
        progress_updated_at: FIRST.dateLastRead,
        sync_links: links,
        title: "Library title",
    });
}

function imported(book, record) {
    return prepareSyncImport([book], [{ bookId: book.book_id, record }])
        .books[0];
}

test("each device keeps its own link and replaces only its own record", () => {
    const UPDATED = { ...FIRST, dateLastRead: "2026-02-02T12:00:00Z" };
    const LINKS = withSyncLink(withSyncLink([FIRST], SECOND), UPDATED);
    assert.deepEqual(LINKS, [SECOND, UPDATED]);
});

test("a legacy link without a device is claimed by the next device to sync", () => {
    const { deviceId: _deviceId, ...LEGACY } = FIRST;
    assert.deepEqual(withSyncLink([LEGACY], SECOND), [SECOND]);
});

test("importing from a second device keeps the first device's link", () => {
    const BOOK = imported(linkedBook([FIRST]), SECOND);
    assert.equal(BOOK.progress_percent, 60);
    assert.deepEqual(BOOK.sync_links, [FIRST, SECOND]);
});

test("a link from one device still matches the same source on another", () => {
    const ENTRY = matchSyncRecord(SECOND, [linkedBook([FIRST])]);
    assert.equal(ENTRY.matchKind, "linked");
    assert.equal(ENTRY.requiresMatchReview, false);
});

test("an import is recorded per device, so another device can still be linked", () => {
    const BOOK = linkedBook([FIRST]);
    const OTHER = { ...FIRST, deviceId: "N418B" };
    assert.equal(
        actionableSyncEntries(syncReviewEntries([FIRST], [BOOK])).length,
        0,
    );
    assert.equal(assessSyncProgress(OTHER, BOOK).kind, "link");
    assert.equal(
        actionableSyncEntries(syncReviewEntries([OTHER], [BOOK])).length,
        1,
    );
});

test("removing one link leaves other devices' links and the source matchable", () => {
    const BOOK = linkedBook(withoutSyncLink([FIRST, SECOND], FIRST));
    assert.deepEqual(BOOK.sync_links, [SECOND]);
    assert.equal(matchSyncRecord(FIRST, [BOOK]).matchKind, "linked");
    const UNLINKED = linkedBook(withoutSyncLink(BOOK.sync_links, SECOND));
    assert.equal(UNLINKED.sync_links, undefined);
    const ENTRY = matchSyncRecord(FIRST, [UNLINKED]);
    assert.equal(ENTRY.matchKind, "none");
    assert.equal(
        actionableSyncEntries(syncReviewEntries([FIRST], [UNLINKED])).length,
        1,
    );
});

test("other providers flow through review and conflicts under their own name", () => {
    const RECORD = { ...FIRST, deviceId: undefined, provider: "reader-app" };
    delete RECORD.deviceId;
    const BOOK = normalizeBook({
        book_id: "book",
        progress_percent: 80,
        progress_updated_at: "2026-01-01T12:00:00Z",
        title: "Book",
    });
    const [ENTRY] = syncReviewEntries([RECORD], [BOOK]);
    const ASSESSMENT = assessSyncProgress(RECORD, BOOK);
    assert.equal(ASSESSMENT.kind, "review");
    const TEXT = syncReviewConflicts(ENTRY, BOOK, ASSESSMENT);
    assert.match(TEXT, /reader-app: /);
    assert.doesNotMatch(TEXT, /Kobo/);
    assert.deepEqual(imported(BOOK, RECORD).sync_links, [RECORD]);
});

test("source labels name the provider and the device when known", () => {
    assert.equal(syncProviderLabel("kobo"), "Kobo");
    assert.equal(syncProviderLabel("reader-app"), "reader-app");
    assert.equal(syncSourceLabel(FIRST), "Kobo (N418A)");
    const { deviceId: _deviceId, ...LEGACY } = FIRST;
    assert.equal(syncSourceLabel(LEGACY), "Kobo");
});
