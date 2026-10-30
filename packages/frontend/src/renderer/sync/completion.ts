/** Derives finish dates from completed synced records without guessing ambiguous times. */
import type {
    Book,
    SyncAssessment,
    SyncRecord,
} from "@reading-schedule/contracts";
import { syncReadTime } from "@reading-schedule/contracts";
import { dayKeyFromDate } from "../app/date_keys.ts";
import { BOOK_STATUS_READ } from "../books/status_catalog.ts";

const KOBO_COMPLETE_PERCENT = 100;

/** Converts a zoned, non-future source time to the local day used by finish dates. */
export function syncFinishedDay(record: SyncRecord): string | null {
    if (record.percentRead < KOBO_COMPLETE_PERCENT) {
        return null;
    }
    const TIME = syncReadTime(record.dateLastRead);
    if (TIME === null || TIME > Date.now()) {
        return null;
    }
    return dayKeyFromDate(new Date(TIME));
}

/** Plans the finish date for a completed record targeting a book already marked read. */
export function completionDateAssessment(
    record: SyncRecord,
    book: Book,
): SyncAssessment | null {
    if (
        record.percentRead < KOBO_COMPLETE_PERCENT ||
        book.status !== BOOK_STATUS_READ
    ) {
        return null;
    }
    const DAY = syncFinishedDay(record);
    if (DAY === null) {
        return {
            kind: "link",
            reason: "The source read time is invalid or lacks a timezone, so the finish date stays unchanged.",
        };
    }
    return finishDateChange(book.finished_at ?? "", DAY);
}

/** Separates a missing date, which is safe to fill, from a different date that needs review. */
function finishDateChange(
    existing: string,
    day: string,
): SyncAssessment | null {
    if (existing === day) {
        return null;
    }
    if (existing === "") {
        return { kind: "ready", reason: `Sets finish date to ${day}.` };
    }
    return {
        kind: "review",
        reason: `Replaces finish date ${existing} with ${day} from the source.`,
    };
}

/** Requires individual approval before a completion replaces a different finish date. */
export function finishDateConflict(
    record: SyncRecord,
    book: Book,
): SyncAssessment | null {
    const ASSESSMENT = completionDateAssessment(record, book);
    if (ASSESSMENT?.kind === "review") {
        return ASSESSMENT;
    }
    return null;
}
