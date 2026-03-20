/**
 * Deduplication helpers for merging Open Library result pages.
 */
import type { SearchDoc } from "@reading-schedule/contracts";
import { primaryAuthor } from "./search-text.ts";

/**
 * Reads the canonical Open Library key from a search document.
 */
function trimmedDocKey(doc: SearchDoc): string {
    return String(doc.key ?? "").trim();
}

/**
 * Builds a fallback key from title and author when the canonical key is empty.
 */
function fallbackDeduplicationKey(doc: SearchDoc): string {
    const TITLE = String(doc.title ?? "").trim();
    const AUTHOR = primaryAuthor(doc).trim();
    if (TITLE.length === 0 && AUTHOR.length === 0) {
        return "";
    }
    return `${TITLE}|${AUTHOR}`;
}

/**
 * Resolves the key used to detect duplicate search documents.
 */
function docDeduplicationKey(doc: SearchDoc): string {
    const KEY = trimmedDocKey(doc);
    if (KEY.length > 0) {
        return KEY;
    }
    return fallbackDeduplicationKey(doc);
}

/**
 * Appends a doc when its dedupe key has not been seen yet.
 */
function appendUniqueDoc(
    doc: SearchDoc,
    seen: Set<string>,
    deduped: SearchDoc[],
): void {
    const DEDUPE_KEY = docDeduplicationKey(doc);
    if (DEDUPE_KEY.length === 0 || seen.has(DEDUPE_KEY)) {
        return;
    }
    seen.add(DEDUPE_KEY);
    deduped.push(doc);
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
        appendUniqueDoc(DOC, SEEN, DEDUPED);
    }
    return DEDUPED;
}
