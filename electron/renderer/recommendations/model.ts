import {
    type Book,
    type RecommendationItem,
    type RecommendationSeed,
} from "../../types/types.js";
import { BOOK_STATUS_READ } from "../books/status_catalog.js";
import { AUTHOR_RECOMMENDATION_CATALOG } from "./catalog.js";

const AUTHOR_LIST_LOCALE = "en";

/**
 * Normalizes text for case-insensitive recommendation matching.
 * @param value Raw text value.
 * @returns Lowercased trimmed text key.
 */
function normalizedText(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(AUTHOR_LIST_LOCALE);
}

/**
 * Builds a stable dedupe key from recommendation title and author.
 * @param title Recommendation title.
 * @param author Recommendation author.
 * @returns Combined normalized key.
 */
function recommendationKey(title: string, author: string): string {
    return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Determines whether a book should count as read for author derivation.
 * @param book Book to inspect.
 * @returns True when read status/progress/finish date indicates completion.
 */
function isReadBook(book: Book): boolean {
    if (book.status === BOOK_STATUS_READ) {
        return true;
    }
    if (book.progress_percent >= 100) {
        return true;
    }
    const FINISHED_AT = String(book.finished_at ?? "").trim();
    if (FINISHED_AT.length > 0) {
        return true;
    }
    return false;
}

/**
 * Derives unique read-author names from the library, preserving first-seen casing.
 * @param books Existing library books.
 * @returns Sorted unique author names that already have at least one read title.
 */
export function deriveReadAuthors(books: Book[]): string[] {
    const DISPLAY_BY_KEY = new Map<string, string>();
    for (const BOOK of books) {
        if (!isReadBook(BOOK)) {
            continue;
        }
        const AUTHOR_TEXT = String(BOOK.author).trim();
        if (AUTHOR_TEXT.length === 0) {
            continue;
        }
        const KEY = normalizedText(AUTHOR_TEXT);
        if (!DISPLAY_BY_KEY.has(KEY)) {
            DISPLAY_BY_KEY.set(KEY, AUTHOR_TEXT);
        }
    }
    return Array.from(DISPLAY_BY_KEY.values()).sort(
        (leftAuthor, rightAuthor) => {
            return leftAuthor.localeCompare(rightAuthor);
        },
    );
}

/**
 * Builds per-author recommendation rows, excluding books already in the library.
 * @param books Existing library books.
 * @param catalog Static local recommendation seeds by normalized author key.
 * @returns Recommendation list suitable for rendering in the Recommendations tab.
 */
export function buildRecommendations(
    books: Book[],
    catalog: Record<
        string,
        RecommendationSeed[]
    > = AUTHOR_RECOMMENDATION_CATALOG,
): RecommendationItem[] {
    const EXISTING_BOOK_KEYS = new Set<string>();
    for (const BOOK of books) {
        EXISTING_BOOK_KEYS.add(recommendationKey(BOOK.title, BOOK.author));
    }

    const RECOMMENDATIONS: RecommendationItem[] = [];
    const RECOMMENDATION_KEYS = new Set<string>();
    for (const AUTHOR of deriveReadAuthors(books)) {
        const AUTHOR_KEY = normalizedText(AUTHOR);
        const SEEDS = catalog[AUTHOR_KEY];
        if (!Array.isArray(SEEDS)) {
            continue;
        }
        for (const SEED of SEEDS) {
            const KEY = recommendationKey(SEED.title, AUTHOR);
            if (EXISTING_BOOK_KEYS.has(KEY) || RECOMMENDATION_KEYS.has(KEY)) {
                continue;
            }
            RECOMMENDATION_KEYS.add(KEY);
            RECOMMENDATIONS.push({
                author: AUTHOR,
                coverUrl: "",
                title: SEED.title,
                wordsTotal: SEED.wordsTotal,
            });
        }
    }
    return RECOMMENDATIONS;
}
