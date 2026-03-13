import type { SearchDoc } from "@reading-schedule/contracts";
import { bestAuthorOnlyScore } from "./search_author_scoring.ts";
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
} from "./search_shared.ts";
import {
    hasEnglishLanguage,
    normalizeSearchText,
    primaryAuthor,
    queryTokens,
} from "./search_text.ts";

/**
 * Scores title relevance against the normalized query text.
 * @param titleNorm - Normalized candidate title.
 * @param queryNorm - Normalized query text.
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
 * @param titleNorm - Normalized candidate title.
 * @param authorNorm - Normalized candidate author string.
 * @param tokens - Normalized query tokens.
 * @returns Token-based relevance score.
 */
function tokenScore(
    titleNorm: string,
    authorNorm: string,
    tokens: string[],
): number {
    let score = 0;

    for (const TOKEN of tokens) {
        if (titleNorm.startsWith(TOKEN)) {
            score += SCORE_TOKEN_PREFIX;
            continue;
        }
        if (titleNorm.includes(TOKEN)) {
            score += SCORE_TOKEN_CONTAINS;
        }
        if (authorNorm.includes(TOKEN)) {
            score += SCORE_TOKEN_AUTHOR;
        }
    }
    return score;
}

/**
 * Scores metadata quality signals such as language/pages/editions.
 * @param doc - Open Library search document.
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
    const EDITION_COUNT = Number(doc.edition_count ?? 0);
    if (EDITION_COUNT > 0) {
        score += Math.min(SCORE_MAX_EDITION_COUNT, EDITION_COUNT);
    }
    return score;
}

/**
 * Computes a deterministic relevance score for a search document.
 * @param doc - Open Library search document.
 * @param query - Raw user query text.
 * @param authorOnly - Whether this score is for author-only searching.
 * @returns Deterministic relevance score.
 */
export function scoreDoc(
    doc: SearchDoc,
    query: string,
    authorOnly = false,
): number {
    const QUERY_NORM = normalizeSearchText(query);
    const TITLE_NORM = normalizeSearchText(doc.title ?? "");
    if (!authorOnly && TITLE_NORM.length === 0) {
        return 0;
    }
    const TOKENS = queryTokens(query);
    if (authorOnly) {
        const AUTHOR_SCORE = bestAuthorOnlyScore(doc, QUERY_NORM, TOKENS);
        if (AUTHOR_SCORE <= 0) {
            return 0;
        }
        return AUTHOR_SCORE + metadataScore(doc);
    }
    const AUTHOR_NORM = normalizeSearchText(primaryAuthor(doc));
    return (
        baseTitleScore(TITLE_NORM, QUERY_NORM) +
        tokenScore(TITLE_NORM, AUTHOR_NORM, TOKENS) +
        metadataScore(doc)
    );
}

export { dedupeDocs } from "./search_dedupe.ts";
