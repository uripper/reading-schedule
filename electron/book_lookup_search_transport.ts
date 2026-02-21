import {
  HTTP_STATUS_ERROR_MIN,
  HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE,
  HTTP_STATUS_REDIRECT_MIN,
  SEARCH_FETCH_LIMIT,
  SEARCH_FIELDS,
  type SearchResponse,
} from "./book_lookup_search_shared.js";

export function searchUrls(query: string): string[] {
  const encoded = encodeURIComponent(query);
  const base = `https://openlibrary.org/search.json?limit=${SEARCH_FETCH_LIMIT}&fields=${SEARCH_FIELDS}`;
  return [
    `${base}&q=${encoded}`,
    `${base}&title=${encoded}`,
    `${base}&title=${encoded}&language=eng`,
  ];
}

export async function fetchJson(url: string): Promise<SearchResponse> {
  const response = await globalThis.fetch(url, { redirect: "follow" });
  const status = Number(response.status || 0);
  if (status >= HTTP_STATUS_REDIRECT_MIN && status < HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE) {
    throw new Error(`Unexpected redirect status (${status})`);
  }
  if (status >= HTTP_STATUS_ERROR_MIN || !response.ok) {
    throw new Error(`Request failed (${status})`);
  }
  return (await response.json()) as SearchResponse;
}
