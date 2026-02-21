import { MIN_QUERY_LENGTH, SEARCH_OUTPUT_LIMIT, type SearchDoc, type SearchItem } from "./book_lookup_search_shared.js";
import { toItem } from "./book_lookup_search_map.js";
import { dedupeDocs, scoreDoc } from "./book_lookup_search_scoring.js";
import { fetchJson, searchUrls } from "./book_lookup_search_transport.js";

export async function searchBooks(query: string): Promise<SearchItem[]> {
  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const responses = await Promise.allSettled(
    searchUrls(normalizedQuery).map((url) => fetchJson(url)),
  );
  const docs: SearchDoc[] = [];
  responses.forEach((result) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value.docs)) {
      return;
    }
    result.value.docs.forEach((doc) => docs.push(doc));
  });
  const scored = dedupeDocs(docs)
    .map((doc) => ({ doc, score: scoreDoc(doc, normalizedQuery) }))
    .filter((entry) => entry.score > 0);
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return String(left.doc.title || "").localeCompare(
      String(right.doc.title || ""),
      undefined,
      { sensitivity: "base" },
    );
  });
  return scored
    .slice(0, SEARCH_OUTPUT_LIMIT)
    .map((entry) => toItem(entry.doc))
    .filter((item) => Boolean(item.title));
}
