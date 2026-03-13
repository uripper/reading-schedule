/**
 * Mapping helpers from Open Library docs to planner search items.
 */

import type { SearchDoc, SearchItem } from "@reading-schedule/contracts";
import {
    COVER_ID_MIN,
    SOURCE_NAME,
    WORDS_PER_PAGE_ESTIMATE,
} from "./search-shared.ts";
import { primaryAuthor } from "./search-text.ts";

function estimateReadingSize(doc: SearchDoc): {
    pagesEstimate: number | null;
    wordsEstimate: number | null;
} {
    const PAGES = Number(doc.number_of_pages_median ?? 0);

    if (!Number.isFinite(PAGES) || PAGES <= 0) {
        return {
            pagesEstimate: null,
            wordsEstimate: null,
        };
    }

    return {
        pagesEstimate: PAGES,
        wordsEstimate: PAGES * WORDS_PER_PAGE_ESTIMATE,
    };
}

function coverUrlFor(doc: SearchDoc): string {
    const COVER_ID = Number(doc.cover_i ?? 0);

    if (COVER_ID < COVER_ID_MIN) {
        return "";
    }

    return `https://covers.openlibrary.org/b/id/${COVER_ID}-L.jpg`;
}

function publishYearFor(doc: SearchDoc): number | "" {
    if (typeof doc.first_publish_year === "number") {
        return doc.first_publish_year;
    }

    return "";
}

/**
 * Converts a raw search document into the app's normalized search item shape.
 * @param doc - Open Library search document.
 * @returns Normalized planner search item.
 */
export function toItem(doc: SearchDoc): SearchItem {
    const READING_SIZE = estimateReadingSize(doc);

    return {
        author: primaryAuthor(doc),
        cover_url: coverUrlFor(doc),
        openlibrary_key: String(doc.key ?? ""),
        pages_estimate: READING_SIZE.pagesEstimate,
        source: SOURCE_NAME,
        title: String(doc.title ?? ""),
        words_estimate: READING_SIZE.wordsEstimate,
        year: publishYearFor(doc),
    };
}
