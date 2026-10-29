/** Describes the actual competing books and update dates instead of generic conflict copy. */
import type {
    Book,
    KoboAssessment,
    KoboProgress,
    KoboReviewEntry,
} from "@reading-schedule/contracts";
import { koboReadTime } from "@reading-schedule/contracts";

/** Formats valid dates locally and retains malformed source values for diagnosis. */
export function koboReadDateLabel(value: string): string {
    const TIME = koboReadTime(value);
    if (TIME === null) {
        return value;
    }
    return new Date(TIME).toLocaleString();
}

/** Identifies each other Kobo title, percentage, and read time targeting the same book. */
function sourceConflicts(entry: KoboReviewEntry, book: Book): string {
    const OTHERS = entry.conflictingRecords ?? [];
    if (OTHERS.length === 0) {
        return "";
    }
    return `Also matched to “${book.title}”: ${OTHERS.map(recordLabel).join("; ")}.`;
}

/** Includes dates to distinguish identically titled device editions. */
function recordLabel(record: KoboProgress): string {
    return `“${record.title}” (${record.percentRead}%, ${koboReadDateLabel(record.dateLastRead)})`;
}

/** Names the alternative library editions behind an uncertain best match. */
function libraryConflicts(entry: KoboReviewEntry, book: Book): string {
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
    entry: KoboReviewEntry,
    book: Book,
    assessment: KoboAssessment,
): string {
    if (assessment.kind === "ready" || assessment.kind === "link") {
        return "";
    }
    const LOCAL_DATE = book.progress_updated_at;
    if (LOCAL_DATE === undefined) {
        return `${assessment.reason} Kobo: ${koboReadDateLabel(entry.record.dateLastRead)}.`;
    }
    return `${assessment.reason} Bartleby: ${koboReadDateLabel(LOCAL_DATE)}; Kobo: ${koboReadDateLabel(entry.record.dateLastRead)}.`;
}

/** Leaves ordinary matches free of instructional prose and names real conflicts. */
export function koboReviewConflicts(
    entry: KoboReviewEntry,
    book: Book,
    assessment: KoboAssessment,
): string {
    return [
        sourceConflicts(entry, book),
        libraryConflicts(entry, book),
        progressConflict(entry, book, assessment),
    ]
        .filter((text) => text !== "")
        .join(" ");
}
