import type { SearchDoc } from "../../types/types.js";
import { primaryAuthor } from "./search_text.js";

/**
 * Removes duplicate docs by canonical key and title/author fallback.
 * @param docs - Raw search docs from one or more Open Library responses.
 * @returns Deduplicated document array preserving first-seen items.
 */
export function dedupeDocs(docs: SearchDoc[]): SearchDoc[] {
    const SEEN = new Set<string>();
    const DEDUPED: SearchDoc[] = [];
    for (const DOC of docs) {
        const KEY = String(DOC.key ?? "").trim();
        if (KEY.length > 0) {
            if (SEEN.has(KEY)) {
                continue;
            }
            SEEN.add(KEY);
            DEDUPED.push(DOC);
            continue;
        }
        const TITLE = String(DOC.title ?? "").trim();
        const AUTHOR = primaryAuthor(DOC).trim();
        if (TITLE.length === 0 && AUTHOR.length === 0) {
            continue;
        }
        const FALLBACK = `${TITLE}|${AUTHOR}`;
        if (SEEN.has(FALLBACK)) {
            continue;
        }
        SEEN.add(FALLBACK);
        DEDUPED.push(DOC);
    }
    return DEDUPED;
}