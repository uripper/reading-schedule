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

function resolveRandomFn(options: RecommendationSearchOptions): () => number {
    const RANDOM_SOURCE = options.randomFn;
    if (typeof RANDOM_SOURCE !== "function") {
        return Math.random;
    }
    return (): number => RANDOM_SOURCE();
}

/**
 * Searches for books by a given author using the RecommendationSearchApi and returns lookup items.
 * @example
 * lookupByAuthor(api, "J.K. Rowling")
 * [{ id: "1", title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling" }]
 * @param api - RecommendationSearchApi instance used to perform the search.
 * @param author - Author name to search for.
 * @returns Promise resolving to an array of BookLookupItem results (empty array on error).
 **/
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

    addLog(
        `Recommendations: Derived ${DERIVED_READ_AUTHORS.length} read authors: ${DERIVED_READ_AUTHORS.join(", ")}`,
    );
    addLog(
        `Recommendations: Sampled ${READ_AUTHORS.length} read authors for this run: ${READ_AUTHORS.join(", ")}`,
    );

    for (const AUTHOR of READ_AUTHORS) {
        const LOOKUP_ITEMS = await lookupByAuthor(api, AUTHOR);
        processAuthorResults({
            author: AUTHOR,
            existingKeys: EXISTING_KEYS,
            lookupItems: LOOKUP_ITEMS,
            recommendationKeys: RECOMMENDATION_KEYS,
            recommendations: RECOMMENDATIONS,
        });
    }

    if (RECOMMENDATIONS.length > 0) {
        addLog(
            `Recommendations: Found ${RECOMMENDATIONS.length} dynamic recommendations, using those.`,
        );
        return RECOMMENDATIONS;
    }
    addLog(
        "Recommendations: No dynamic results, falling back to static catalog.",
    );
    return buildRecommendations(books);
}
