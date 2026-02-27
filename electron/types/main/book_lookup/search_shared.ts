/**
 * Raw Open Library search document as returned by the API.
 */
export interface SearchDoc {
  author_name?: string[];
  cover_i?: number;
  edition_count?: number;
  first_publish_year?: number;
  key?: string;
  language?: string[];
  number_of_pages_median?: number;
  title?: string;
}

/**
 * Minimal search response envelope used by lookup transport helpers.
 */
export interface SearchResponse {
  docs?: SearchDoc[];
}

/**
 * Normalized search item consumed by renderer book-picker UI.
 */
export interface SearchItem {
  author: string;
  cover_url: string;
  openlibrary_key: string;
  pages_estimate: number | null;
  source: string;
  title: string;
  words_estimate: number | null;
  year: number | "";
}
