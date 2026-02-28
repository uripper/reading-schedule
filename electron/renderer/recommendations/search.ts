import type {
	Book,
	BookLookupItem,
	RecommendationItem,
	RecommendationSearchApi,
} from "../../types/types.js";
import { addLog } from "../help.js";
import { buildRecommendations, deriveReadAuthors } from "./model.js";
import { MAX_AUTHORS } from "./search_constants.js";
import { addExistingBookKeys } from "./search_matchers.js";
import {
	pickRandomSample,
	processAuthorResults,
	sampleResultsSummary,
} from "./search_processing.js";

interface RecommendationSearchOptions {
	randomFn?(this: void): number;
}

/**
 * Fetches recommendations from lookup search using already-read authors in the shelf.
 * Falls back to static local recommendations when no dynamic matches are found.
 * @param books Existing library books.
 * @param api Planner API lookup surface.
 * @param options Optional random source used for author sampling.
 * @returns Recommendation rows suitable for panel rendering.
 */
export async function findRecommendations(
	books: Book[],
	api: RecommendationSearchApi,
	options: RecommendationSearchOptions = {},
): Promise<RecommendationItem[]> {
	addLog("Recommendations: Starting search...");
	const existingKeys = addExistingBookKeys(books);
	const recommendationKeys = new Set<string>();
	const recommendations: RecommendationItem[] = [];
	let randomFn: () => number = Math.random;
	const randomSource = options.randomFn;
	if (typeof randomSource === "function") {
		randomFn = (): number => randomSource();
	}
	const derivedReadAuthors = deriveReadAuthors(books);
	const readAuthors = pickRandomSample(
		derivedReadAuthors,
		MAX_AUTHORS,
		randomFn,
	);

	addLog(
		`Recommendations: Derived ${derivedReadAuthors.length} read authors: ${derivedReadAuthors.join(", ")}`,
	);
	addLog(
		`Recommendations: Sampled ${readAuthors.length} read authors for this run: ${readAuthors.join(", ")}`,
	);

	for (const author of readAuthors) {
		let lookupItems: BookLookupItem[] = [];
		addLog(`Recommendations: Searching for author-only results: "${author}"`);
		try {
			lookupItems = await api.searchBooks(author, true);
			addLog(
				`Recommendations: Got ${lookupItems.length} results for "${author}"`,
			);
			if (lookupItems.length > 0) {
				addLog(
					`Recommendations: Sample results: ${sampleResultsSummary(lookupItems)}`,
				);
			}
		} catch (error) {
			addLog(
				`Recommendations: Search failed for "${author}": ${String(error)}`,
			);
			lookupItems = [];
		}
		processAuthorResults({
			author,
			lookupItems,
			existingKeys,
			recommendationKeys,
			recommendations,
		});
	}

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
