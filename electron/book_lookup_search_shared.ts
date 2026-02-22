/**
 * @file Shared constants and data contracts for book lookup search.
 */
export const SEARCH_FIELDS =
  "title,title_suggest,author_name,first_publish_year,number_of_pages_median,cover_i,key,language,edition_count";
export const SEARCH_FETCH_LIMIT = 24;
export const SEARCH_OUTPUT_LIMIT = 12;
export const MIN_QUERY_LENGTH = 2;

export const HTTP_STATUS_REDIRECT_MIN = 300;
export const HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE = 400;
export const HTTP_STATUS_ERROR_MIN = 400;

export const COVER_ID_MIN = 1;
export const WORDS_PER_PAGE_ESTIMATE = 300;

export const SCORE_EXACT_TITLE = 700;
export const SCORE_PREFIX_TITLE = 360;
export const SCORE_CONTAINS_TITLE = 240;
export const SCORE_TOKEN_PREFIX = 40;
export const SCORE_TOKEN_CONTAINS = 20;
export const SCORE_TOKEN_AUTHOR = 12;
export const SCORE_ENGLISH_LANGUAGE = 45;
export const SCORE_HAS_PAGE_COUNT = 5;
export const SCORE_MAX_EDITION_COUNT = 20;

export const SOURCE_NAME = "Open Library";

/**
 * Raw Open Library search document as returned by the API.
 */
export type SearchDoc = {
  author_name?: string[];
  cover_i?: number;
  edition_count?: number;
  first_publish_year?: number;
  key?: string;
  language?: string[];
  number_of_pages_median?: number;
  title?: string;
};

/**
 * Minimal search response envelope used by lookup transport helpers.
 */
export type SearchResponse = {
  docs?: SearchDoc[];
};

/**
 * Normalized search item consumed by renderer book-picker UI.
 */
export type SearchItem = {
  author: string;
  cover_url: string;
  openlibrary_key: string;
  pages_estimate: number | null;
  source: string;
  title: string;
  words_estimate: number | null;
  year: number | "";
};
