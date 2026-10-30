/** Describes the actual competing books and update dates instead of generic conflict copy. */
import type {
    Book,
    SyncAssessment,
    SyncRecord,
    SyncReviewEntry,
} from "@reading-schedule/contracts";
import { syncReadTime } from "@reading-schedule/contracts";
import { syncProviderLabel } from "./links.ts";

/** Formats valid dates locally and retains malformed source values for diagnosis. */
export function syncReadDateLabel(value: string): string {
    const TIME = syncReadTime(value);
    if (TIME === null) {
        return value;
    }
    return new Date(TIME).toLocaleString();
}

/** Identifies each other source title, percentage, and read time targeting the same book. */
function sourceConflicts(entry: SyncReviewEntry, book: Book): string {
    const OTHERS = entry.conflictingRecords ?? [];
    if (OTHERS.length === 0) {
        return "";
    }
    return `Also matched to “${book.title}”: ${OTHERS.map(recordLabel).join("; ")}.`;
}

/** Names a device book by title and, when the device credits one, its author. */
export function syncRecordName(record: SyncRecord): string {
    if (record.author === undefined) {
        return record.title;
    }
    return `${record.title} — ${record.author}`;
}

/** Includes authors and dates to distinguish identically titled device editions. */
function recordLabel(record: SyncRecord): string {
    return `“${syncRecordName(record)}” (${record.percentRead}%, ${syncReadDateLabel(record.dateLastRead)})`;
}

/** Names the alternative library editions behind an uncertain best match. */
function libraryConflicts(entry: SyncReviewEntry, book: Book): string {
    if (
        !(
            entry.requiresMatchReview &&
            entry.matches.some(
                (candidate) => candidate.book_id === book.book_id,
            )
        )
    ) {
        return "";
    }
    const OTHERS = entry.matches.filter(
        (candidate) => candidate.book_id !== book.book_id,
    );
    if (OTHERS.length === 0) {
        return "";
    }
    return `Other library matches: ${OTHERS.map(libraryLabel).join("; ")}.`;
}

/** Shows edition metadata rather than opaque internal IDs. */
function libraryLabel(book: Book): string {
    return `“${book.title}” — ${book.author || "Unknown author"} (${book.shelf || "No shelf"}, ${book.progress_percent}%)`;
}

/** Adds only information needed to judge an actual reading-progress conflict. */
function progressConflict(
    entry: SyncReviewEntry,
    book: Book,
    assessment: SyncAssessment,
): string {
    if (assessment.kind === "ready" || assessment.kind === "link") {
        return assessment.reason;
    }
    const LOCAL_DATE = book.progress_updated_at;
    const SOURCE = syncProviderLabel(entry.record.provider);
    if (LOCAL_DATE === undefined) {
        return `${assessment.reason} ${SOURCE}: ${syncReadDateLabel(entry.record.dateLastRead)}.`;
    }
    return `${assessment.reason} Bartleby: ${syncReadDateLabel(LOCAL_DATE)}; ${SOURCE}: ${syncReadDateLabel(entry.record.dateLastRead)}.`;
}

/** Leaves ordinary matches free of instructional prose and names real conflicts. */
export function syncReviewConflicts(
    entry: SyncReviewEntry,
    book: Book,
    assessment: SyncAssessment,
): string {
    return [
        sourceConflicts(entry, book),
        libraryConflicts(entry, book),
        progressConflict(entry, book, assessment),
    ]
        .filter((text) => text !== "")
        .join(" ");
}
