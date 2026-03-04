/**
 * @file HTTP transport helpers for Open Library book search.
 */

import type { SearchResponse } from "../../types/types.js";
import {
    HTTP_STATUS_ERROR_MIN,
    HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE,
    HTTP_STATUS_REDIRECT_MIN,
    SEARCH_FETCH_LIMIT,
    SEARCH_FIELDS,
} from "./search_shared.js";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_LANGUAGE_ENGLISH = "eng";

/**
 * Builds prioritized Open Library query URLs for a search string.
 * @param query Raw user query text.
 * @param authorOnly Whether to search author field exclusively.
 * @returns Ordered list of search endpoint URLs.
 */
export function searchUrls(query: string, authorOnly = false): string[] {
    const ENCODED = encodeURIComponent(query);
    const BASE = `${OPEN_LIBRARY_SEARCH_URL}?limit=${SEARCH_FETCH_LIMIT}&fields=${SEARCH_FIELDS}`;
    if (authorOnly) {
        // Intentionally omit `fields` in author-only mode because Open Library
        // ranking quality regresses with projected fields for these queries.
        const AUTHOR_ONLY_BASE = `${OPEN_LIBRARY_SEARCH_URL}?limit=${SEARCH_FETCH_LIMIT}`;
        return [
            `${AUTHOR_ONLY_BASE}&author=${ENCODED}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
            `${AUTHOR_ONLY_BASE}&author=${ENCODED}`,
        ];
    }
    return [
        `${BASE}&q=${ENCODED}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
        `${BASE}&author=${ENCODED}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
        `${BASE}&title=${ENCODED}&language=${OPEN_LIBRARY_LANGUAGE_ENGLISH}`,
    ];
}

/**
 * Fetches and validates one Open Library JSON response payload.
 * @param url Open Library API URL.
 * @returns Parsed search response payload.
 */
export async function fetchJson(url: string): Promise<SearchResponse> {
    const RESPONSE = await globalThis.fetch(url, { redirect: "follow" });
    const STATUS = Number(RESPONSE.status || 0);
    if (
        STATUS >= HTTP_STATUS_REDIRECT_MIN &&
        STATUS < HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE
    ) {
        throw new Error(`Unexpected redirect status (${STATUS})`);
    }
    if (STATUS >= HTTP_STATUS_ERROR_MIN || !RESPONSE.ok) {
        throw new Error(`Request failed (${STATUS})`);
    }
    return (await RESPONSE.json()) as SearchResponse;
}
