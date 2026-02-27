/**
 * @file HTTP transport helpers for Open Library book search.
 */
import {
  HTTP_STATUS_ERROR_MIN,
  HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE,
  HTTP_STATUS_REDIRECT_MIN,
  SEARCH_FETCH_LIMIT,
  SEARCH_FIELDS,
} from "./search_shared.js";
import type { SearchResponse } from "../../types/types.js";

/**
 * Builds prioritized Open Library query URLs for a search string.
 * @param query Raw user query text.
 * @returns Ordered list of search endpoint URLs.
 */
export function searchUrls(query: string): string[] {
  const encoded = encodeURIComponent(query);
  const base = `https://openlibrary.org/search.json?limit=${SEARCH_FETCH_LIMIT}&fields=${SEARCH_FIELDS}`;
  return [
    `${base}&q=${encoded}&language=eng`,
    `${base}&author=${encoded}&language=eng`,
    `${base}&title=${encoded}&language=eng`,
  ];
}

/**
 * Fetches and validates one Open Library JSON response payload.
 * @param url Open Library API URL.
 * @returns Parsed search response payload.
 */
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
