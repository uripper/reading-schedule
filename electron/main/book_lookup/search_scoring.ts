/**
 * @file Ranking helpers used to score Open Library search results.
 */
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
} from "./search_shared.js";
import type { SearchDoc } from "../../types/types.js";
import {
  hasEnglishLanguage,
  normalizeSearchText,
  primaryAuthor,
  queryTokens,
} from "./search_text.js";
import { bestAuthorOnlyScore } from "./search_author_scoring.js";

/**
 * Scores title relevance against the normalized query text.
 * @param titleNorm Normalized candidate title.
 * @param queryNorm Normalized query text.
 * @returns Title-only relevance score.
 */
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

/**
 * Scores title/author matches against normalized query tokens.
 * @param titleNorm Normalized candidate title.
 * @param authorNorm Normalized candidate author string.
 * @param tokens Normalized query tokens.
 * @returns Token-based relevance score.
 */
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

/**
 * Scores metadata quality signals such as language/pages/editions.
 * @param doc Open Library search document.
 * @returns Metadata contribution to overall score.
 */
function metadataScore(doc: SearchDoc): number {
  let score = 0;
  if (hasEnglishLanguage(doc)) {
    score += SCORE_ENGLISH_LANGUAGE;
  }
  if (Number(doc.number_of_pages_median ?? 0) > 0) {
    score += SCORE_HAS_PAGE_COUNT;
  }
  const editionCount = Number(doc.edition_count ?? 0);
  if (editionCount > 0) {
    score += Math.min(SCORE_MAX_EDITION_COUNT, editionCount);
  }
  return score;
}

/**
 * Computes a deterministic relevance score for a search document.
 * @param doc Open Library search document.
 * @param query Raw user query text.
 * @param authorOnly Whether this score is for author-only searching.
 * @returns Deterministic relevance score.
 */
export function scoreDoc(
  doc: SearchDoc,
  query: string,
  authorOnly = false,
): number {
  const queryNorm = normalizeSearchText(query);
  const titleNorm = normalizeSearchText(doc.title ?? "");
  if (!authorOnly && titleNorm.length === 0) {
    return 0;
  }
  const tokens = queryTokens(query);
  if (authorOnly) {
    const authorScore = bestAuthorOnlyScore(doc, queryNorm, tokens);
    if (authorScore <= 0) {
      return 0;
    }
    return authorScore + metadataScore(doc);
  }
  const authorNorm = normalizeSearchText(primaryAuthor(doc));
  return (
    baseTitleScore(titleNorm, queryNorm) +
    tokenScore(titleNorm, authorNorm, tokens) +
    metadataScore(doc)
  );
}

export { dedupeDocs } from "./search_dedupe.js";
