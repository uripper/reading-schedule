/**
 * @file Search orchestration for Open Library queries.
 */

import { toItem } from "./search_map.js";
import { dedupeDocs, scoreDoc } from "./search_scoring.js";
import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT } from "./search_shared.js";
import { fetchJson, searchUrls } from "./search_transport.js";

import type { SearchDoc, SearchItem } from "../../types/types.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Queries Open Library endpoints and returns ranked search items.
 * @param query User-entered search query text.
 * @param authorOnly Whether to search author field exclusively.
 * @returns Ranked search items limited to configured output size.
 */
export async function searchBooks(
  query: string,
  authorOnly = false,
): Promise<SearchItem[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const urls = searchUrls(normalizedQuery, authorOnly);
  console.info(
    `[OpenLibrary] Searching (authorOnly=${authorOnly}): "${normalizedQuery}"`,
  );
  console.info(`[OpenLibrary] URLs: ${urls.join(" | ")}`);
  const responses = await Promise.allSettled(
    urls.map(async (url) => await fetchJson(url)),
  );
  const docs: SearchDoc[] = [];
  responses.forEach((result) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value.docs)) {
      return;
    }
    result.value.docs.forEach((doc) => {
      docs.push(doc);
    });
  });
  console.info(
    `[OpenLibrary] Raw results before dedup/scoring: ${docs.length}`,
  );
  const scored = dedupeDocs(docs)
    .map((doc) => ({ doc, score: scoreDoc(doc, normalizedQuery, authorOnly) }))
    .filter((entry) => entry.score > 0);
  console.info(`[OpenLibrary] After scoring: ${scored.length} with score > 0`);
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return String(left.doc.title ?? "").localeCompare(
      String(right.doc.title ?? ""),
      undefined,
      { sensitivity: "base" },
    );
  });
  const final = scored
    .slice(0, SEARCH_OUTPUT_LIMIT)
    .map((entry) => toItem(entry.doc))
    .filter((item) => Boolean(item.title));
  console.info(
    `[OpenLibrary] Final results (limit ${SEARCH_OUTPUT_LIMIT}): ${final.length}`,
  );
  if (!IS_PRODUCTION) {
    final.forEach((item, idx) => {
      console.info(
        `  [${idx + 1}] "${item.title}" by ${item.author} (${item.words_estimate} words)`,
      );
    });
  }
  return final;
}
