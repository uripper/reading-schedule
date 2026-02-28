/**
 * Constants for recommendation search and filtering.
 */
export const MAX_AUTHORS = 5;
export const MAX_PER_AUTHOR = 3;
export const DEFAULT_WORDS_TOTAL = 60000;
export const WORDS_PER_PAGE_ESTIMATE = 300;
export const AUTHOR_LOCALE = "en";
export const AUTHOR_ONLY_OPENLIBRARY_LIMIT = 24;
export const AUTHOR_ONLY_OPENLIBRARY_BASE_URL =
  "https://openlibrary.org/search.json";
export const AUTHOR_ONLY_OPENLIBRARY_QUERY_PARAM_LIMIT = "limit";
export const AUTHOR_ONLY_OPENLIBRARY_QUERY_PARAM_AUTHOR = "author";
export const AUTHOR_ONLY_OPENLIBRARY_QUERY_PARAM_LANGUAGE = "language";
// English-only author recommendations keep ranking/noise predictable.
export const AUTHOR_ONLY_OPENLIBRARY_LANGUAGE = "eng";
export const TITLE_MIN_LENGTH = 2;
export const TITLE_MAX_LENGTH = 90;
export const AUTHOR_MAX_LENGTH = 64;
export const AUTHOR_MAX_WORDS = 4;
export const AUTHOR_MIN_KEY_LENGTH = 5;
export const SAMPLE_RESULTS_COUNT = 3;
export const NON_BOOK_TITLE_PATTERNS = [
  "proceedings",
  "journal",
  "coloquio",
  "conference",
  "universidad",
  "investigación",
];
