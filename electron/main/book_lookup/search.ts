import type { SearchDoc, SearchItem } from "@reading-schedule/contracts";
import { logInfo } from "../../types/logger.ts";
import { toItem } from "./search_map.ts";
import { dedupeDocs, scoreDoc } from "./search_scoring.ts";
import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT } from "./search_shared.ts";
import { fetchJson, searchUrls } from "./search_transport.ts";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

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
    const DOCS: SearchDoc[] = [];

    for (const RESULT of RESPONSES) {
        if (
            RESULT.status !== "fulfilled" ||
            !Array.isArray(RESULT.value.docs)
        ) {
            continue;
        }

        DOCS.push(...RESULT.value.docs);
    }
    logInfo(`[OpenLibrary] Raw results before dedup/scoring: ${DOCS.length}`);
    const SCORED = dedupeDocs(DOCS)
        .map((doc) => ({
            doc,
            score: scoreDoc(doc, NORMALIZED_QUERY, authorOnly),
        }))
        .filter((entry) => entry.score > 0);
    logInfo(`[OpenLibrary] After scoring: ${SCORED.length} with score > 0`);
    SCORED.sort((left, right) => {
        if (left.score !== right.score) {
            return right.score - left.score;
        }
        return String(left.doc.title ?? "").localeCompare(
            String(right.doc.title ?? ""),
            undefined,
            { sensitivity: "base" },
        );
    });
    const FINAL = SCORED.slice(0, SEARCH_OUTPUT_LIMIT)
        .map((entry) => toItem(entry.doc))
        .filter((item) => Boolean(item.title));
    logInfo(
        `[OpenLibrary] Final results (limit ${SEARCH_OUTPUT_LIMIT}): ${FINAL.length}`,
    );
    if (!IS_PRODUCTION) {
        FINAL.forEach((item, idx) => {
            logInfo(
                `  [${idx + 1}] "${item.title}" by ${item.author} (${item.words_estimate} words)`,
            );
        });
    }
    return FINAL;
}
