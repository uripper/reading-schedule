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
  const seen = new Set<string>();
  const deduped: SearchDoc[] = [];
  docs.forEach((doc) => {
    const key = String(doc.key ?? "").trim();
    if (key.length > 0) {
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      deduped.push(doc);
      return;
    }
    const title = String(doc.title ?? "").trim();
    const author = primaryAuthor(doc).trim();
    if (title.length === 0 && author.length === 0) {
      return;
    }
    const fallback = `${title}|${author}`;
    if (seen.has(fallback)) {
      return;
    }
    seen.add(fallback);
    deduped.push(doc);
  });
  return deduped;
}
