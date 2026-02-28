import type { SearchDoc } from "../../types/types.js";
import {
    SCORE_AUTHOR_ALL_TOKENS,
    SCORE_AUTHOR_EXACT,
    SCORE_AUTHOR_PARTIAL_TOKEN,
} from "./search_shared.js";
import { normalizeSearchText, primaryAuthor } from "./search_text.js";

/**
 * Splits normalized text into non-empty tokens.
 * @param value Normalized text value.
 * @returns Non-empty tokens.
 */
function normalizedTokens(value: string): string[] {
    return value.split(/\s+/).filter(Boolean);
}

/**
 * Counts matching query tokens present in author tokens.
 * @param authorTokens Candidate author tokens.
 * @param queryTokenList Query tokens to match.
 * @returns Number of matched query tokens.
 */
function matchingAuthorTokenCount(
    authorTokens: string[],
    queryTokenList: string[],
): number {
    const authorTokenSet = new Set(authorTokens);
    let matches = 0;
    queryTokenList.forEach((token) => {
        if (!authorTokenSet.has(token)) {
            return;
        }
        matches += 1;
    });
    return matches;
}

/**
 * Scores one normalized author string against the normalized query.
 * @param authorNorm Normalized author name.
 * @param queryNorm Normalized query text.
 * @param tokens Query tokens.
 * @returns Author-match score.
 */
function authorMatchScore(
    authorNorm: string,
    queryNorm: string,
    tokens: string[],
): number {
    if (
        authorNorm.length === 0 ||
        queryNorm.length === 0 ||
        tokens.length === 0
    ) {
        return 0;
    }
    if (authorNorm === queryNorm) {
        return SCORE_AUTHOR_EXACT;
    }
    const authorTokens = normalizedTokens(authorNorm);
    if (authorTokens.length === 0) {
        return 0;
    }
    const matchedCount = matchingAuthorTokenCount(authorTokens, tokens);
    if (matchedCount <= 0) {
        return 0;
    }
    let minimumMatchedTokens = 1;
    if (tokens.length >= 2) {
        minimumMatchedTokens = 2;
    }
    if (matchedCount < minimumMatchedTokens) {
        return 0;
    }
    if (matchedCount >= tokens.length) {
        return (
            SCORE_AUTHOR_ALL_TOKENS + matchedCount * SCORE_AUTHOR_PARTIAL_TOKEN
        );
    }
    return matchedCount * SCORE_AUTHOR_PARTIAL_TOKEN;
}

/**
 * Returns best author-match score from all author names on a document.
 * @param doc Open Library search document.
 * @param queryNorm Normalized query text.
 * @param tokens Query tokens.
 * @returns Best author-only score across author names.
 */
export function bestAuthorOnlyScore(
    doc: SearchDoc,
    queryNorm: string,
    tokens: string[],
): number {
    // Recommendations use the primary author for display/filter decisions.
    // Keep scoring aligned to that same field to avoid surfacing mismatch-heavy docs.
    return authorMatchScore(
        normalizeSearchText(primaryAuthor(doc)),
        queryNorm,
        tokens,
    );
}
