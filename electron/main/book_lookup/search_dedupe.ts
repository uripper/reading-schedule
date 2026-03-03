/**
 * @file Deduplication helpers for raw Open Library search documents.
 */
import type { SearchDoc } from "../../types/types.js";
import { primaryAuthor } from "./search_text.js";

/**
 * Removes duplicate docs by canonical key and title/author fallback.
 * @param docs Raw search docs from one or more Open Library responses.
 * @returns Deduplicated document array preserving first-seen items.
 */
export function dedupeDocs(docs: SearchDoc[]): SearchDoc[] {
    const SEEN = new Set<string>();
    const DEDUPED: SearchDoc[] = [];
    docs.forEach((doc) => {
        const KEY = String(doc.key ?? "").trim();
        if (KEY.length > 0) {
            if (SEEN.has(KEY)) {
                return;
            }
            SEEN.add(KEY);
            DEDUPED.push(doc);
            return;
        }
        const TITLE = String(doc.title ?? "").trim();
        const AUTHOR = primaryAuthor(doc).trim();
        if (TITLE.length === 0 && AUTHOR.length === 0) {
            return;
        }
        const FALLBACK = `${TITLE}|${AUTHOR}`;
        if (SEEN.has(FALLBACK)) {
            return;
        }
        SEEN.add(FALLBACK);
        DEDUPED.push(doc);
    });
    return DEDUPED;
}
