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

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_LANGUAGE_ENGLISH = "eng";

/**
 * Builds prioritized Open Library query URLs for a search string.
 * @param query Raw user query text.
 * @param authorOnly Whether to search author field exclusively.
 * @returns Ordered list of search endpoint URLs.
 */
export function searchUrls(
  query: string,
  authorOnly = false,
): string[] {
  const encoded = encodeURIComponent(query);
  const base =
    `${OPEN_LIBRARY_SEARCH_URL}?limit=${SEARCH_FETCH_LIMIT}&fields=${SEARCH_FIELDS}`;
  if (authorOnly) {
    // Intentionally omit `fields` in author-only mode because Open Library
    // ranking quality regresses with projected fields for these queries.
    const authorOnlyBase = `${OPEN_LIBRARY_SEARCH_URL}?limit=${SEARCH_FETCH_LIMIT}`;
    return [
      `${authorOnlyBase}&author=${encoded}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
      `${authorOnlyBase}&author=${encoded}`,
    ];
  }
  return [
    `${base}&q=${encoded}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
    `${base}&author=${encoded}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
    `${base}&title=${encoded}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
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
  if (
    status >= HTTP_STATUS_REDIRECT_MIN &&
    status < HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE
  ) {
    throw new Error(`Unexpected redirect status (${status})`);
  }
  if (status >= HTTP_STATUS_ERROR_MIN || !response.ok) {
    throw new Error(`Request failed (${status})`);
  }
  return (await response.json()) as SearchResponse;
}
