/**
 * Recommendation search flow that probes authors already read in the shelf and falls back to the static catalog.
 */
import type {
    Book,
    BookLookupItem,
    RecommendationItem,
    RecommendationSearchApi,
} from "../../types/types.ts";
import { addLog } from "../help.ts";
import { buildRecommendations, deriveReadAuthors } from "./model.ts";
import { MAX_AUTHORS } from "./search_constants.ts";
import { addExistingBookKeys } from "./search_matchers.ts";
import {
    pickRandomSample,
    processAuthorResults,
    sampleResultsSummary,
} from "./search_processing.ts";

interface RecommendationSearchOptions {
    randomFn?(this: void): number;
}

/**
 * Resolves the random-number source used for author sampling.
 * @param options - Search options supplied by the caller.
 * @returns Zero-argument random function.
 */
function resolveRandomFn(options: RecommendationSearchOptions): () => number {
    const RANDOM_SOURCE = options.randomFn;
    if (typeof RANDOM_SOURCE !== "function") {
        return Math.random;
    }
    return (): number => RANDOM_SOURCE();
}

/**
 * Searches for books by a given author using the RecommendationSearchApi and returns lookup items.
 * Errors are logged and converted into an empty result so the broader recommendation flow can continue.
 * @param api - RecommendationSearchApi instance used to perform the search.
 * @param author - Author name to search for.
 * @returns Promise resolving to an array of BookLookupItem results (empty array on error).
 */
async function lookupByAuthor(
    api: RecommendationSearchApi,
    author: string,
): Promise<BookLookupItem[]> {
    addLog(`Recommendations: Searching for author-only results: "${author}"`);
    try {
        const LOOKUP_ITEMS = await api.searchBooks(author, true);
        addLog(
            `Recommendations: Got ${LOOKUP_ITEMS.length} results for "${author}"`,
        );
        if (LOOKUP_ITEMS.length > 0) {
            addLog(
                `Recommendations: Sample results: ${sampleResultsSummary(LOOKUP_ITEMS)}`,
            );
        }
        return LOOKUP_ITEMS;
    } catch (error) {
        addLog(
            `Recommendations: Search failed for "${author}": ${String(error)}`,
        );
        return [];
    }
}

/**
 * Logs the derived shelf authors and the smaller sampled subset used for the current lookup run.
 * @param derivedReadAuthors - All read authors found in the shelf.
 * @param sampledReadAuthors - Authors chosen for live lookup in this search.
 */
function logReadAuthorSelection(
    derivedReadAuthors: string[],
    sampledReadAuthors: string[],
): void {
    addLog(
        `Recommendations: Derived ${derivedReadAuthors.length} read authors: ${derivedReadAuthors.join(", ")}`,
    );
    addLog(
        `Recommendations: Sampled ${sampledReadAuthors.length} read authors for this run: ${sampledReadAuthors.join(", ")}`,
    );
}

/**
 * Starts one lookup per sampled read author.
 * @param api - Recommendation search API.
 * @param readAuthors - Authors sampled from the read shelf.
 * @returns Promise resolving to one lookup result array per sampled author.
 */
function lookupReadAuthors(
    api: RecommendationSearchApi,
    readAuthors: string[],
): Promise<BookLookupItem[][]> {
    return Promise.all(
        readAuthors.map((author) => {
            return lookupByAuthor(api, author);
        }),
    );
}

interface ProcessReadAuthorLookupsArgs {
    existingKeys: Set<string>;
    lookupItemsByAuthor: BookLookupItem[][];
    readAuthors: string[];
    recommendationKeys: Set<string>;
    recommendations: RecommendationItem[];
}

/**
 * Applies lookup results author-by-author and mutates the recommendation accumulator.
 * @param args - Lookup results and dedupe state for the current search run.
 */
function processReadAuthorLookups(args: ProcessReadAuthorLookupsArgs): void {
    for (const [Index, Author] of args.readAuthors.entries()) {
        processAuthorResults({
            author: Author,
            existingKeys: args.existingKeys,
            lookupItems: args.lookupItemsByAuthor[Index] ?? [],
            recommendationKeys: args.recommendationKeys,
            recommendations: args.recommendations,
        });
    }
}

/**
 * Returns dynamic recommendations when any were found, otherwise falls back to the static catalog.
 * @param books - Existing library books.
 * @param recommendations - Dynamic recommendations gathered from author lookups.
 * @returns Final recommendation rows used by the renderer.
 */
function finishRecommendationSearch(
    books: Book[],
    recommendations: RecommendationItem[],
): RecommendationItem[] {
    if (recommendations.length > 0) {
        addLog(
            `Recommendations: Found ${recommendations.length} dynamic recommendations, using those.`,
        );
        return recommendations;
    }
    addLog(
        "Recommendations: No dynamic results, falling back to static catalog.",
    );
    return buildRecommendations(books);
}

/**
 * Fetches recommendations from lookup search using already-read authors in the shelf.
 * Falls back to static local recommendations when no dynamic matches are found.
 * @param books - Existing library books.
 * @param api - Planner API lookup surface.
 * @param options - Optional random source used for author sampling.
 * @returns Recommendation rows suitable for panel rendering.
 */
export async function findRecommendations(
    books: Book[],
    api: RecommendationSearchApi,
    options: RecommendationSearchOptions = {},
): Promise<RecommendationItem[]> {
    addLog("Recommendations: Starting search...");
    const EXISTING_KEYS = addExistingBookKeys(books);
    const RECOMMENDATION_KEYS = new Set<string>();
    const RECOMMENDATIONS: RecommendationItem[] = [];
    const RANDOM_FN = resolveRandomFn(options);
    const DERIVED_READ_AUTHORS = deriveReadAuthors(books);
    const READ_AUTHORS = pickRandomSample(
        DERIVED_READ_AUTHORS,
        MAX_AUTHORS,
        RANDOM_FN,
    );

    logReadAuthorSelection(DERIVED_READ_AUTHORS, READ_AUTHORS);
    processReadAuthorLookups({
        existingKeys: EXISTING_KEYS,
        lookupItemsByAuthor: await lookupReadAuthors(api, READ_AUTHORS),
        readAuthors: READ_AUTHORS,
        recommendationKeys: RECOMMENDATION_KEYS,
        recommendations: RECOMMENDATIONS,
    });
    return finishRecommendationSearch(books, RECOMMENDATIONS);
}
