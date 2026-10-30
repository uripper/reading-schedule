/** Matches synced book records and protects newer or uncertain Bartleby progress. */
import type {
    Book,
    SyncAssessment,
    SyncRecord,
    SyncReviewEntry,
} from "@reading-schedule/contracts";
import { syncReadTime } from "@reading-schedule/contracts";
import { completionDateAssessment, finishDateConflict } from "./completion.ts";
import { linkedSyncRecord } from "./links.ts";
import { matchSyncRecord } from "./matching.ts";

/** Builds review rows without choosing among duplicate titles. */
export function syncReviewEntries(
    records: readonly SyncRecord[],
    books: readonly Book[],
): SyncReviewEntry[] {
    const ENTRIES = records.map((record) => matchSyncRecord(record, books));
    const TARGETS = targetRecords(ENTRIES);
    return ENTRIES.map((entry) => {
        const OTHERS = (TARGETS.get(entry.suggestedBookId ?? "") ?? []).filter(
            (record) => record !== entry.record,
        );
        return {
            ...entry,
            conflictingRecords: OTHERS,
            requiresSourceReview: OTHERS.length > 0,
        };
    });
}

/** Retains the actual competing device records for precise conflict messages. */
function targetRecords(
    entries: readonly SyncReviewEntry[],
): Map<string, SyncRecord[]> {
    const TARGETS = new Map<string, SyncRecord[]>();
    for (const ENTRY of entries) {
        const ID = ENTRY.suggestedBookId;
        if (ID === null) {
            continue;
        }
        const RECORDS = TARGETS.get(ID) ?? [];
        RECORDS.push(ENTRY.record);
        TARGETS.set(ID, RECORDS);
    }
    return TARGETS;
}

/** Detects exact source replays even when page rounding changed the stored percentage. */
export function isSyncRecordImported(record: SyncRecord, book: Book): boolean {
    const PREVIOUS = linkedSyncRecord(book.sync_links, record);
    return (
        PREVIOUS !== undefined &&
        PREVIOUS.dateLastRead === record.dateLastRead &&
        PREVIOUS.percentRead === record.percentRead
    );
}

/** Explains unsafe time comparisons before any progress can be applied. */
function timeAssessment(record: SyncRecord, book: Book): SyncAssessment | null {
    const SOURCE_TIME = syncReadTime(record.dateLastRead);
    if (SOURCE_TIME === null || SOURCE_TIME > Date.now()) {
        return {
            kind: "blocked",
            reason: "Invalid or future source reading time. Check the source's clock and retry.",
        };
    }
    if (book.progress_updated_at === undefined) {
        return null;
    }
    return compareProgressTimes(SOURCE_TIME, book.progress_updated_at);
}

/** Blocks stale values and requires a deliberate choice when ordering is tied. */
function compareProgressTimes(
    sourceTime: number,
    updatedAt: string,
): SyncAssessment | null {
    const LOCAL_TIME = syncReadTime(updatedAt);
    if (LOCAL_TIME === null) {
        return {
            kind: "blocked",
            reason: "Bartleby progress has an invalid update time. Edit progress and retry.",
        };
    }
    if (sourceTime < LOCAL_TIME) {
        return {
            kind: "blocked",
            reason: "Bartleby has a newer reading-progress update.",
        };
    }
    if (sourceTime === LOCAL_TIME) {
        return {
            kind: "review",
            reason: "Different progress at the same read time.",
        };
    }
    return null;
}

/** Classifies one proposed update; review entries are excluded from Select all. */
export function assessSyncProgress(
    record: SyncRecord,
    book: Book,
): SyncAssessment {
    if (record.percentRead === book.progress_percent) {
        return equalProgressAssessment(record, book);
    }
    if (isSyncRecordImported(record, book)) {
        return { kind: "unchanged", reason: "Already imported or unchanged." };
    }
    const TIME_ASSESSMENT = timeAssessment(record, book);
    if (TIME_ASSESSMENT !== null) {
        return TIME_ASSESSMENT;
    }
    return finishDateConflict(record, book) ?? progressAssessment(record, book);
}

/** Links equal progress, offering a missing or different finish date only once per source record. */
function equalProgressAssessment(
    record: SyncRecord,
    book: Book,
): SyncAssessment {
    const LINK: SyncAssessment = { kind: "link", reason: "" };
    if (isSyncRecordImported(record, book)) {
        return LINK;
    }
    return completionDateAssessment(record, book) ?? LINK;
}

/** Distinguishes first imports from decreases and legacy progress with unknown ordering. */
function progressAssessment(record: SyncRecord, book: Book): SyncAssessment {
    if (record.percentRead < book.progress_percent) {
        return {
            kind: "review",
            reason: "Source progress is lower than Bartleby's.",
        };
    }
    if (book.progress_updated_at === undefined && book.progress_percent > 0) {
        return {
            kind: "review",
            reason: "Bartleby's progress has no update date.",
        };
    }
    return { kind: "ready", reason: "" };
}

/** Keeps unmatched and ambiguous rows visible but omits exact no-op updates. */
export function actionableSyncEntries(
    entries: readonly SyncReviewEntry[],
): SyncReviewEntry[] {
    return entries.filter((entry) => {
        const BOOK = entry.matches.find(
            (book) => book.book_id === entry.suggestedBookId,
        );
        if (BOOK === undefined) {
            return true;
        }
        return !isSyncRecordImported(entry.record, BOOK);
    });
}

/** Automatic popups require an importable change, including one needing review. */
export function hasSyncUpdates(entries: readonly SyncReviewEntry[]): boolean {
    return entries.some((entry) =>
        entry.matches.some((book) => {
            const KIND = assessSyncProgress(entry.record, book).kind;
            return KIND === "ready" || KIND === "link" || KIND === "review";
        }),
    );
}
