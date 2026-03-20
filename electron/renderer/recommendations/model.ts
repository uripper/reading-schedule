/**
 * Static recommendation catalog helpers for deriving read-author suggestions from shelf history.
 */
import type {
    Book,
    RecommendationItem,
    RecommendationSeed,
} from "../../types/types.ts";
import { BOOK_STATUS_READ } from "../books/status_catalog.ts";

const AUTHOR_LIST_LOCALE = "en";
/**
 * Normalized author key to ordered recommendation seed list.
 */
type RecommendationCatalog = Record<string, RecommendationSeed[]>;

const AUTHOR_RECOMMENDATION_CATALOG: RecommendationCatalog = {
    "george orwell": [
        { title: "Homage to Catalonia", wordsTotal: 73000 },
        { title: "Keep the Aspidistra Flying", wordsTotal: 89000 },
    ],
    "jane austen": [
        { title: "Persuasion", wordsTotal: 86500 },
        { title: "Mansfield Park", wordsTotal: 160000 },
    ],
    "toni morrison": [
        { title: "Beloved", wordsTotal: 98000 },
        { title: "Sula", wordsTotal: 54000 },
    ],
    "ursula k. le guin": [
        { title: "The Left Hand of Darkness", wordsTotal: 96000 },
        { title: "A Wizard of Earthsea", wordsTotal: 56000 },
    ],
};

/**
 * Normalizes text for case-insensitive recommendation matching.
 * @param value - Raw text value.
 * @returns Lowercased trimmed text key.
 */
function normalizedText(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(AUTHOR_LIST_LOCALE);
}

/**
 * Builds a stable dedupe key from recommendation title and author.
 * @param title - Recommendation title.
 * @param author - Recommendation author.
 * @returns Combined normalized key.
 */
function recommendationKey(title: string, author: string): string {
    return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Determines whether a book should count as read for author derivation.
 * @param book - Book to inspect.
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

function readableAuthorText(book: Book): string {
    return String(book.author).trim();
}

function storeReadAuthor(displayByKey: Map<string, string>, book: Book): void {
    if (!isReadBook(book)) {
        return;
    }
    const AUTHOR_TEXT = readableAuthorText(book);
    if (AUTHOR_TEXT.length === 0) {
        return;
    }
    const KEY = normalizedText(AUTHOR_TEXT);
    if (!displayByKey.has(KEY)) {
        displayByKey.set(KEY, AUTHOR_TEXT);
    }
}

function sortedReadAuthors(displayByKey: Map<string, string>): string[] {
    return Array.from(displayByKey.values()).sort((leftAuthor, rightAuthor) => {
        return leftAuthor.localeCompare(rightAuthor);
    });
}

/**
 * Derives unique read-author names from the library, preserving first-seen casing.
 * @param books - Existing library books.
 * @returns Sorted unique author names that already have at least one read title.
 */
export function deriveReadAuthors(books: Book[]): string[] {
    const DISPLAY_BY_KEY = new Map<string, string>();
    for (const BOOK of books) {
        storeReadAuthor(DISPLAY_BY_KEY, BOOK);
    }
    return sortedReadAuthors(DISPLAY_BY_KEY);
}

function existingRecommendationKeys(books: Book[]): Set<string> {
    const EXISTING_BOOK_KEYS = new Set<string>();
    for (const BOOK of books) {
        EXISTING_BOOK_KEYS.add(recommendationKey(BOOK.title, BOOK.author));
    }
    return EXISTING_BOOK_KEYS;
}

function authorSeeds(
    catalog: RecommendationCatalog,
    author: string,
): RecommendationSeed[] {
    const SEEDS = catalog[normalizedText(author)];
    if (!Array.isArray(SEEDS)) {
        return [];
    }
    return SEEDS;
}

function recommendationKeyExists(args: {
    key: string;
    existingBookKeys: Set<string>;
    recommendationKeys: Set<string>;
}): boolean {
    return (
        args.existingBookKeys.has(args.key) ||
        args.recommendationKeys.has(args.key)
    );
}

function appendSeedRecommendation(args: {
    author: string;
    seed: RecommendationSeed;
    recommendationKey: string;
    recommendationKeys: Set<string>;
    recommendations: RecommendationItem[];
}): void {
    args.recommendationKeys.add(args.recommendationKey);
    args.recommendations.push({
        author: args.author,
        coverUrl: "",
        title: args.seed.title,
        wordsTotal: args.seed.wordsTotal,
    });
}

function appendAuthorRecommendations(args: {
    author: string;
    catalog: RecommendationCatalog;
    existingBookKeys: Set<string>;
    recommendationKeys: Set<string>;
    recommendations: RecommendationItem[];
}): void {
    for (const SEED of authorSeeds(args.catalog, args.author)) {
        const KEY = recommendationKey(SEED.title, args.author);
        if (
            recommendationKeyExists({
                existingBookKeys: args.existingBookKeys,
                key: KEY,
                recommendationKeys: args.recommendationKeys,
            })
        ) {
            continue;
        }
        appendSeedRecommendation({
            author: args.author,
            recommendationKey: KEY,
            recommendationKeys: args.recommendationKeys,
            recommendations: args.recommendations,
            seed: SEED,
        });
    }
}

/**
 * Builds per-author recommendation rows, excluding books already in the library.
 * @param books - Existing library books.
 * @param catalog - Static local recommendation seeds by normalized author key.
 * @returns Recommendation list suitable for rendering in the Recommendations tab.
 */
export function buildRecommendations(
    books: Book[],
    catalog: RecommendationCatalog = AUTHOR_RECOMMENDATION_CATALOG,
): RecommendationItem[] {
    const EXISTING_BOOK_KEYS = existingRecommendationKeys(books);
    const RECOMMENDATIONS: RecommendationItem[] = [];
    const RECOMMENDATION_KEYS = new Set<string>();
    for (const AUTHOR of deriveReadAuthors(books)) {
        appendAuthorRecommendations({
            author: AUTHOR,
            catalog,
            existingBookKeys: EXISTING_BOOK_KEYS,
            recommendationKeys: RECOMMENDATION_KEYS,
            recommendations: RECOMMENDATIONS,
        });
    }
    return RECOMMENDATIONS;
}
