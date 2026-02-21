import type { SearchDoc } from "./book_lookup_search_shared.js";
import {
  SCORE_CONTAINS_TITLE,
  SCORE_ENGLISH_LANGUAGE,
  SCORE_EXACT_TITLE,
  SCORE_HAS_PAGE_COUNT,
  SCORE_MAX_EDITION_COUNT,
  SCORE_PREFIX_TITLE,
  SCORE_TOKEN_AUTHOR,
  SCORE_TOKEN_CONTAINS,
  SCORE_TOKEN_PREFIX,
} from "./book_lookup_search_shared.js";
import {
  hasEnglishLanguage,
  normalizeSearchText,
  primaryAuthor,
  queryTokens,
} from "./book_lookup_search_text.js";

function baseTitleScore(titleNorm: string, queryNorm: string): number {
  let score = 0;
  if (titleNorm === queryNorm) {
    score += SCORE_EXACT_TITLE;
  }
  if (titleNorm.startsWith(queryNorm)) {
    score += SCORE_PREFIX_TITLE;
  }
  if (titleNorm.includes(queryNorm)) {
    score += SCORE_CONTAINS_TITLE;
  }
  return score;
}

function tokenScore(
  titleNorm: string,
  authorNorm: string,
  tokens: string[],
): number {
  let score = 0;
  tokens.forEach((token) => {
    if (titleNorm.startsWith(token)) {
      score += SCORE_TOKEN_PREFIX;
      return;
    }
    if (titleNorm.includes(token)) {
      score += SCORE_TOKEN_CONTAINS;
    }
    if (authorNorm.includes(token)) {
      score += SCORE_TOKEN_AUTHOR;
    }
  });
  return score;
}

function metadataScore(doc: SearchDoc): number {
  let score = 0;
  if (hasEnglishLanguage(doc)) {
    score += SCORE_ENGLISH_LANGUAGE;
  }
  if (Number(doc.number_of_pages_median || 0) > 0) {
    score += SCORE_HAS_PAGE_COUNT;
  }
  const editionCount = Number(doc.edition_count || 0);
  if (editionCount > 0) {
    score += Math.min(SCORE_MAX_EDITION_COUNT, editionCount);
  }
  return score;
}

export function scoreDoc(doc: SearchDoc, query: string): number {
  const queryNorm = normalizeSearchText(query);
  const titleNorm = normalizeSearchText(doc.title || "");
  if (!titleNorm) {
    return 0;
  }
  const authorNorm = normalizeSearchText(primaryAuthor(doc));
  const tokens = queryTokens(query);
  return (
    baseTitleScore(titleNorm, queryNorm) +
    tokenScore(titleNorm, authorNorm, tokens) +
    metadataScore(doc)
  );
}

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
