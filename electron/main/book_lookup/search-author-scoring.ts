import type { SearchDoc } from "@reading-schedule/contracts";
import {
    SCORE_AUTHOR_ALL_TOKENS,
    SCORE_AUTHOR_EXACT,
    SCORE_AUTHOR_PARTIAL_TOKEN,
} from "./search-shared.ts";
import { normalizeSearchText, primaryAuthor } from "./search-text.ts";

/**
 * Splits normalized text into non-empty tokens.
 * @param value - Normalized text value.
 * @returns Non-empty tokens.
 */
function normalizedTokens(value: string): string[] {
    return value.split(/\s+/).filter(Boolean);
}

/**
 * Counts matching query tokens present in author tokens.
 * @param authorTokens - Candidate author tokens.
 * @param queryTokenList - Query tokens to match.
 * @returns Number of matched query tokens.
 */
function matchingAuthorTokenCount(
    authorTokens: string[],
    queryTokenList: string[],
): number {
    const AUTHOR_TOKEN_SET = new Set(authorTokens);
    let matches = 0;
    for (const TOKEN of queryTokenList) {
        if (AUTHOR_TOKEN_SET.has(TOKEN)) {
            matches += 1;
        }
    }
    return matches;
}

function minimumMatchedTokens(tokens: string[]): number {
    if (tokens.length >= 2) {
        return 2;
    }

    return 1;
}

function scoreMatchedTokens(matchedCount: number, tokenCount: number): number {
    if (matchedCount >= tokenCount) {
        return (
            SCORE_AUTHOR_ALL_TOKENS + matchedCount * SCORE_AUTHOR_PARTIAL_TOKEN
        );
    }

    return matchedCount * SCORE_AUTHOR_PARTIAL_TOKEN;
}

function hasAuthorMatchInputs(
    authorNorm: string,
    queryNorm: string,
    tokens: string[],
): boolean {
    return authorNorm.length > 0 && queryNorm.length > 0 && tokens.length > 0;
}

function scoredAuthorTokenMatch(
    authorTokens: string[],
    tokens: string[],
): number {
    if (authorTokens.length === 0) {
        return 0;
    }
    const MATCHED_COUNT = matchingAuthorTokenCount(authorTokens, tokens);
    if (MATCHED_COUNT <= 0 || MATCHED_COUNT < minimumMatchedTokens(tokens)) {
        return 0;
    }
    return scoreMatchedTokens(MATCHED_COUNT, tokens.length);
}

/**
 * Scores one normalized author string against the normalized query.
 * @param authorNorm - Normalized author name.
 * @param queryNorm - Normalized query text.
 * @param tokens - Query tokens.
 * @returns Author-match score.
 */
function authorMatchScore(
    authorNorm: string,
    queryNorm: string,
    tokens: string[],
): number {
    if (!hasAuthorMatchInputs(authorNorm, queryNorm, tokens)) {
        return 0;
    }
    if (authorNorm === queryNorm) {
        return SCORE_AUTHOR_EXACT;
    }
    return scoredAuthorTokenMatch(normalizedTokens(authorNorm), tokens);
}

/**
 * Returns best author-match score from all author names on a document.
 * @param doc - Open Library search document.
 * @param queryNorm - Normalized query text.
 * @param tokens - Query tokens.
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
