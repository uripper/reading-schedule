/** Matches Kobo book records and protects newer or uncertain Bartleby progress. */
import type {
    Book,
    KoboAssessment,
    KoboProgress,
    KoboReviewEntry,
} from "@reading-schedule/contracts";
import { koboReadTime } from "@reading-schedule/contracts";
import { matchKoboRecord } from "./matching.ts";

/** Builds review rows without choosing among duplicate titles. */
export function koboReviewEntries(
    records: readonly KoboProgress[],
    books: readonly Book[],
): KoboReviewEntry[] {
    const ENTRIES = records.map((record) => matchKoboRecord(record, books));
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
    entries: readonly KoboReviewEntry[],
): Map<string, KoboProgress[]> {
    const TARGETS = new Map<string, KoboProgress[]>();
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
export function isKoboRecordImported(
    record: KoboProgress,
    book: Book,
): boolean {
    const PREVIOUS = book.kobo_progress;
    return (
        PREVIOUS?.contentId === record.contentId &&
        PREVIOUS.dateLastRead === record.dateLastRead &&
        PREVIOUS.percentRead === record.percentRead
    );
}

/** Explains unsafe time comparisons before any progress can be applied. */
function timeAssessment(
    record: KoboProgress,
    book: Book,
): KoboAssessment | null {
    const SOURCE_TIME = koboReadTime(record.dateLastRead);
    if (SOURCE_TIME === null || SOURCE_TIME > Date.now()) {
        return {
            kind: "blocked",
            reason: "Invalid or future Kobo reading time. Check the device clock and retry.",
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
): KoboAssessment | null {
    const LOCAL_TIME = koboReadTime(updatedAt);
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

/** Classifies one proposed update; review entries are excluded from Update all. */
export function assessKoboProgress(
    record: KoboProgress,
    book: Book,
): KoboAssessment {
    if (record.percentRead === book.progress_percent) {
        return {
            kind: "link",
            reason: "",
        };
    }
    if (isKoboRecordImported(record, book)) {
        return { kind: "unchanged", reason: "Already imported or unchanged." };
    }
    const TIME_ASSESSMENT = timeAssessment(record, book);
    if (TIME_ASSESSMENT !== null) {
        return TIME_ASSESSMENT;
    }
    return progressAssessment(record, book);
}

/** Distinguishes first imports from decreases and legacy progress with unknown ordering. */
function progressAssessment(record: KoboProgress, book: Book): KoboAssessment {
    if (record.percentRead < book.progress_percent) {
        return {
            kind: "review",
            reason: "Kobo progress is lower than Bartleby's.",
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
export function actionableKoboEntries(
    entries: readonly KoboReviewEntry[],
): KoboReviewEntry[] {
    return entries.filter((entry) => {
        const BOOK = entry.matches.find(
            (book) => book.book_id === entry.suggestedBookId,
        );
        if (BOOK === undefined) {
            return true;
        }
        return !isKoboRecordImported(entry.record, BOOK);
    });
}

/** Automatic popups require an importable change, including one needing review. */
export function hasKoboUpdates(entries: readonly KoboReviewEntry[]): boolean {
    return entries.some((entry) =>
        entry.matches.some((book) => {
            const KIND = assessKoboProgress(entry.record, book).kind;
            return KIND === "ready" || KIND === "link" || KIND === "review";
        }),
    );
}
