/**
 * Mapping helpers from Open Library docs to planner search items.
 */

import type { SearchDoc, SearchItem } from "@reading-schedule/contracts";
import {
    COVER_ID_MIN,
    SOURCE_NAME,
    WORDS_PER_PAGE_ESTIMATE,
} from "./search_shared.js";
import { primaryAuthor } from "./search_text.js";

/**
 * Converts a raw search document into the app's normalized search item shape.
 * @param doc - Open Library search document.
 * @returns Normalized planner search item.
 */
export function toItem(doc: SearchDoc): SearchItem {
    const PAGES = Number(doc.number_of_pages_median ?? 0);
    let pagesEstimate: number | null = null;
    let words: number | null = null;
    if (PAGES > 0) {
        pagesEstimate = PAGES;
        words = PAGES * WORDS_PER_PAGE_ESTIMATE;
    }
    const COVER_ID = Number(doc.cover_i ?? 0);
    let coverUrl = "";
    if (COVER_ID >= COVER_ID_MIN) {
        coverUrl = `https://covers.openlibrary.org/b/id/${COVER_ID}-L.jpg`;
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
