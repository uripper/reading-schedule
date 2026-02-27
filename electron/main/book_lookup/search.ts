/**
 * @file Search orchestration for Open Library queries.
 */
import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT, type SearchDoc, type SearchItem } from "./search_shared.js";
import { toItem } from "./search_map.js";
import { dedupeDocs, scoreDoc } from "./search_scoring.js";
import { fetchJson, searchUrls } from "./search_transport.js";

/**
 * Queries Open Library endpoints and returns ranked search items.
 * @param query User-entered search query text.
 * @returns Ranked search items limited to configured output size.
 */
export async function searchBooks(query: string): Promise<SearchItem[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const responses = await Promise.allSettled(
    searchUrls(normalizedQuery).map(async (url) => await fetchJson(url)),
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
  const scored = dedupeDocs(docs)
    .map((doc) => ({ doc, score: scoreDoc(doc, normalizedQuery) }))
    .filter((entry) => entry.score > 0);
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
  return scored
    .slice(0, SEARCH_OUTPUT_LIMIT)
    .map((entry) => toItem(entry.doc))
    .filter((item) => Boolean(item.title));
}
