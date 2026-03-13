import type { SearchDoc } from "@reading-schedule/contracts";
import { primaryAuthor } from "./search-text.ts";

function docDeduplicationKey(doc: SearchDoc): string {
    const KEY = String(doc.key ?? "").trim();

    if (KEY.length > 0) {
        return KEY;
    }

    const TITLE = String(doc.title ?? "").trim();
    const AUTHOR = primaryAuthor(doc).trim();

    if (TITLE.length === 0 && AUTHOR.length === 0) {
        return "";
    }

    return `${TITLE}|${AUTHOR}`;
}

/**
 * Removes duplicate docs by canonical key and title/author fallback.
 * @param docs - Raw search docs from one or more Open Library responses.
 * @returns Deduplicated document array preserving first-seen items.
 */
export function dedupeDocs(docs: SearchDoc[]): SearchDoc[] {
    const SEEN = new Set<string>();
    const DEDUPED: SearchDoc[] = [];

    for (const DOC of docs) {
        const DEDUPE_KEY = docDeduplicationKey(DOC);

        if (DEDUPE_KEY.length === 0) {
            continue;
        }

        if (SEEN.has(DEDUPE_KEY)) {
            continue;
        }

        SEEN.add(DEDUPE_KEY);
        DEDUPED.push(DOC);
    }

    return DEDUPED;
}
