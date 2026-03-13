import type { SearchDoc, SearchItem } from "@reading-schedule/contracts";
import { logInfo } from "../../types/logger.ts";
import { isProductionEnvironment } from "../runtime-env.ts";
import { dedupeDocs } from "./search-dedupe.ts";
import { toItem } from "./search-map.ts";
import { scoreDoc } from "./search-scoring.ts";
import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT } from "./search-shared.ts";
import { fetchJson, searchUrls } from "./search-transport.ts";

interface SearchResponseDocShape {
    docs?: unknown;
}

interface ScoredDoc {
    doc: SearchDoc;
    score: number;
}

function collectDocs(
    responses: PromiseSettledResult<SearchResponseDocShape>[],
): SearchDoc[] {
    const DOCS: SearchDoc[] = [];

    for (const RESULT of responses) {
        if (
            RESULT.status !== "fulfilled" ||
            !Array.isArray(RESULT.value.docs)
        ) {
            continue;
        }

        DOCS.push(...RESULT.value.docs);
    }

    return DOCS;
}

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
 * Queries Open Library endpoints and returns ranked search items.
 * @param query - User-entered search query text.
 * @param authorOnly - Whether to search author field exclusively.
 * @returns Ranked search items limited to configured output size.
 */
export async function searchBooks(
    query: string,
    authorOnly = false,
): Promise<SearchItem[]> {
    const NORMALIZED_QUERY = query.trim();
    if (NORMALIZED_QUERY.length < MIN_QUERY_LENGTH) {
        return [];
    }
    const URLS = searchUrls(NORMALIZED_QUERY, authorOnly);
    logInfo(
        `[OpenLibrary] Searching (authorOnly=${authorOnly}): "${NORMALIZED_QUERY}"`,
    );
    logInfo(`[OpenLibrary] URLs: ${URLS.join(" | ")}`);
    const RESPONSES = await Promise.allSettled(
        URLS.map(async (url) => await fetchJson(url)),
    );
    const DOCS = collectDocs(RESPONSES);
    logInfo(`[OpenLibrary] Raw results before dedup/scoring: ${DOCS.length}`);
    const SCORED = rankDocs(DOCS, NORMALIZED_QUERY, authorOnly);
    logInfo(`[OpenLibrary] After scoring: ${SCORED.length} with score > 0`);
    SCORED.sort(compareScoredDocs);
    const FINAL = SCORED.slice(0, SEARCH_OUTPUT_LIMIT)
        .map((entry) => toItem(entry.doc))
        .filter((item) => Boolean(item.title));
    logInfo(
        `[OpenLibrary] Final results (limit ${SEARCH_OUTPUT_LIMIT}): ${FINAL.length}`,
    );
    logSearchItems(FINAL);
    return FINAL;
}
