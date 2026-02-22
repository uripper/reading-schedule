import type { SearchDoc } from "./book_lookup_search_shared.js";
import { primaryAuthor } from "./book_lookup_search_text.js";

export function dedupeDocs(docs: SearchDoc[]): SearchDoc[] {
  const seen = new Set<string>();
  const deduped: SearchDoc[] = [];
  docs.forEach((doc) => {
    const key = String(doc.key || "").trim();
    if (key) {
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      deduped.push(doc);
      return;
    }
    const fallback = `${String(doc.title || "").trim()}|${primaryAuthor(doc).trim()}`;
    if (!fallback.trim() || seen.has(fallback)) {
      return;
    }
    seen.add(fallback);
    deduped.push(doc);
  });
  return deduped;
}
