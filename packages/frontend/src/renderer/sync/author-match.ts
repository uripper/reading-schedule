/** Compares source and library authors, tolerating name order, initials, and separators. */
import type {
    Book,
    SyncAuthorAgreement,
    SyncRecord,
} from "@reading-schedule/contracts";
import { normalizeSyncTitle, syncTitleSimilarity } from "./match-score.ts";

/** Sources such as Kobo join co-authors with `&`; commas are kept because they also invert names. */
const AUTHOR_SEPARATOR = /\s*(?:&|;|\/|\band\b)\s*/iu;
const AUTHOR_MATCH_SCORE = 0.7;
const AUTHOR_WEIGHT = 0.25;
const TITLE_WEIGHT = 1 - AUTHOR_WEIGHT;
const AGREEMENT_ORDER: Record<SyncAuthorAgreement, number> = {
    match: 0,
    mismatch: 2,
    unknown: 1,
};

/** Splits credited names and drops blanks so missing metadata never counts as a mismatch. */
function authorNames(value: string | undefined): string[] {
    return (value ?? "")
        .split(AUTHOR_SEPARATOR)
        .map(normalizeSyncTitle)
        .filter((name) => name !== "");
}

/** Scores the closest pair of credited names, or null when either side is unknown. */
export function syncAuthorSimilarity(
    source: string | undefined,
    library: string | undefined,
): number | null {
    const SOURCE = authorNames(source);
    const LIBRARY = authorNames(library);
    if (SOURCE.length === 0 || LIBRARY.length === 0) {
        return null;
    }
    return Math.max(
        ...SOURCE.flatMap((name) =>
            LIBRARY.map((candidate) => syncTitleSimilarity(name, candidate)),
        ),
    );
}

/** Classifies author evidence for one record and library book. */
export function syncAuthorAgreement(
    record: SyncRecord,
    book: Book,
): SyncAuthorAgreement {
    const SCORE = syncAuthorSimilarity(record.author, book.author);
    if (SCORE === null) {
        return "unknown";
    }
    if (SCORE >= AUTHOR_MATCH_SCORE) {
        return "match";
    }
    return "mismatch";
}

/** Blends author similarity into a title score, keeping title-only scores without authors. */
export function withAuthorScore(
    titleScore: number,
    sourceAuthor: string | undefined,
    libraryAuthor: string | undefined,
): number {
    const AUTHOR = syncAuthorSimilarity(sourceAuthor, libraryAuthor);
    if (AUTHOR === null) {
        return titleScore;
    }
    return TITLE_WEIGHT * titleScore + AUTHOR_WEIGHT * AUTHOR;
}

/** Orders same-title books so matching authors come first and mismatches last. */
export function byAuthorAgreement(
    record: SyncRecord,
    books: readonly Book[],
): Book[] {
    const RANKED = [...books];
    RANKED.sort(
        (left, right) =>
            AGREEMENT_ORDER[syncAuthorAgreement(record, left)] -
            AGREEMENT_ORDER[syncAuthorAgreement(record, right)],
    );
    return RANKED;
}

/** A same-title choice is clear when it is unique and plausible, or the only author match. */
export function isClearTitleChoice(
    record: SyncRecord,
    ranked: readonly Book[],
): boolean {
    const [FIRST, SECOND] = ranked.map((book) =>
        syncAuthorAgreement(record, book),
    );
    if (FIRST === undefined || FIRST === "mismatch") {
        return false;
    }
    if (SECOND === undefined) {
        return true;
    }
    return FIRST === "match" && SECOND === "mismatch";
}
