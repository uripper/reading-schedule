/**
 * Book lookup search pipeline used by the main process.
 */
import type {
    ScoredDoc,
    SearchDoc,
    SearchDocsResponse,
    SearchItem,
} from "@reading-schedule/contracts";
import { logInfo } from "../../types/logger.ts";
import { isProductionEnvironment } from "../runtime-env.ts";
import { dedupeDocs } from "./search-dedupe.ts";
import { toItem } from "./search-map.ts";
import { scoreDoc } from "./search-scoring.ts";
import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT } from "./search-shared.ts";
import { fetchJson, searchUrls } from "./search-transport.ts";

/**
 * Collects every successful docs array from the Open Library responses.
 */
function collectDocs(responses: SearchDocsResponse): SearchDoc[] {
    const DOCS: SearchDoc[] = [];

    for (const RESULT of responses) {
        if (RESULT.status !== "fulfilled" || !hasSearchDocs(RESULT.value)) {
            continue;
        }

        DOCS.push(...RESULT.value.docs);
    }

    return DOCS;
}

/**
 * Trims user input to the minimum query length enforced by the lookup UI.
 */
function normalizedSearchQuery(query: string): string {
    const NORMALIZED_QUERY = query.trim();
    if (NORMALIZED_QUERY.length < MIN_QUERY_LENGTH) {
        return "";
    }
    return NORMALIZED_QUERY;
}

/**
 * Dedupe, score, and discard search docs that do not earn a positive score.
 */
function rankDocs(
    docs: SearchDoc[],
    normalizedQuery: string,
    authorOnly: boolean,
): ScoredDoc[] {
    return dedupeDocs(docs)
        .map((doc) => ({
            doc,
            score: scoreDoc(doc, normalizedQuery, authorOnly),
        }))
        .filter((entry) => entry.score > 0);
}

/**
 * Orders scored docs by relevance and then by title for stable results.
 */
function compareScoredDocs(left: ScoredDoc, right: ScoredDoc): number {
    if (left.score !== right.score) {
        return right.score - left.score;
    }

    return String(left.doc.title ?? "").localeCompare(
        String(right.doc.title ?? ""),
        undefined,
        { sensitivity: "base" },
    );
}

/**
 * Logs rendered lookup items when the app is running outside production.
 */
function logSearchItems(items: SearchItem[]): void {
    if (isProductionEnvironment()) {
        return;
    }

    items.forEach((item, idx) => {
        logInfo(
            `  [${idx + 1}] "${item.title}" by ${item.author} (${item.words_estimate} words)`,
        );
    });
}

/**
 * Narrows a response payload to one that actually contains search docs.
 */
function hasSearchDocs(response: { docs?: unknown }): response is {
    docs: SearchDoc[];
} {
    return Array.isArray(response.docs);
}

/**
 * Fetches Open Library search documents for the normalized query.
 */
async function fetchSearchDocs(
    query: string,
    authorOnly: boolean,
): Promise<SearchDoc[]> {
    const URLS = searchUrls(query, authorOnly);

    logInfo(`[OpenLibrary] URLs: ${URLS.join(" | ")}`);

    const RESPONSES = await Promise.allSettled(
        URLS.map(async (url) => await fetchJson(url)),
    );

    return collectDocs(RESPONSES);
}

/**
 * Produces the final ranked and filtered search item list for rendering.
 */
function finalizeSearchItems(
    docs: SearchDoc[],
    normalizedQuery: string,
    authorOnly: boolean,
): SearchItem[] {
    const SCORED = rankDocs(docs, normalizedQuery, authorOnly);

    logInfo(`[OpenLibrary] After scoring: ${SCORED.length} with score > 0`);
    SCORED.sort(compareScoredDocs);

    return SCORED.slice(0, SEARCH_OUTPUT_LIMIT)
        .map((entry) => toItem(entry.doc))
        .filter((item) => Boolean(item.title));
}

/**
 * Logs the intermediate and final search item counts around the scoring pass.
 */
async function loggedFinalSearchItems(
    normalizedQuery: string,
    authorOnly: boolean,
): Promise<SearchItem[]> {
    const DOCS = await fetchSearchDocs(normalizedQuery, authorOnly);
    logInfo(`[OpenLibrary] Raw results before dedup/scoring: ${DOCS.length}`);
    const FINAL = finalizeSearchItems(DOCS, normalizedQuery, authorOnly);
    logInfo(
        `[OpenLibrary] Final results (limit ${SEARCH_OUTPUT_LIMIT}): ${FINAL.length}`,
    );
    return FINAL;
}

/**
 * Queries Open Library endpoints and returns ranked search items.
 * @param query - User-entered search query text.
 * @param authorOnly - Whether to search author field exclusively.
 * @returns Ranked search items limited to configured output size.
 */
export async function searchBooks(
    query: string,
    authorOnly = false,
): Promise<SearchItem[]> {
    const NORMALIZED_QUERY = normalizedSearchQuery(query);
    if (NORMALIZED_QUERY === "") {
        return [];
    }
    logInfo(
        `[OpenLibrary] Searching (authorOnly=${authorOnly}): "${NORMALIZED_QUERY}"`,
    );
    const FINAL = await loggedFinalSearchItems(NORMALIZED_QUERY, authorOnly);
    logSearchItems(FINAL);
    return FINAL;
}
