/**
 * @file Mapping helpers from Open Library docs to planner search items.
 */
import {
  COVER_ID_MIN,
  SOURCE_NAME,
  WORDS_PER_PAGE_ESTIMATE,
  type SearchDoc,
  type SearchItem,
} from "./search_shared.js";
import { primaryAuthor } from "./search_text.js";

/**
 * Converts a raw search document into the app's normalized search item shape.
 * @param doc Open Library search document.
 * @returns Normalized planner search item.
 */
export function toItem(doc: SearchDoc): SearchItem {
  const pages = Number(doc.number_of_pages_median ?? 0);
  let pagesEstimate: number | null = null;
  let words: number | null = null;
  if (pages > 0) {
    pagesEstimate = pages;
    words = pages * WORDS_PER_PAGE_ESTIMATE;
  }
  const coverId = Number(doc.cover_i ?? 0);
  let coverUrl = "";
  if (coverId >= COVER_ID_MIN) {
    coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  }
  let publishYear: number | "" = "";
  if (typeof doc.first_publish_year === "number") {
    publishYear = doc.first_publish_year;
  }
  return {
    author: primaryAuthor(doc),
    cover_url: coverUrl,
    openlibrary_key: String(doc.key ?? ""),
    pages_estimate: pagesEstimate,
    source: SOURCE_NAME,
    title: String(doc.title ?? ""),
    words_estimate: words,
    year: publishYear,
  };
}
