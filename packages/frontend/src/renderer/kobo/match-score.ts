/** Scores normalized book titles for spelling and subtitle differences. */
const IGNORED_WORDS = new Set(["a", "an", "and", "the"]);
const GRAM_LENGTH = 2;
const DICE_MULTIPLIER = 2;
const CONTAINED_WORD_SCORE = 0.9;
const MIN_SHARED_WORDS = 2;
const MIN_SIGNIFICANT_WORD_LENGTH = 4;
const EDITION_WORDS = new Set([
    "edition",
    "illustrated",
    "volume",
    "book",
    "novel",
]);

/** Treats punctuation, accents, and common connecting words consistently. */
export function normalizeKoboTitle(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .split(/\s+/)
        .filter((word) => !IGNORED_WORDS.has(word))
        .join(" ");
}

/** Collects adjacent character pairs for typo-tolerant Dice similarity. */
function characterGrams(value: string): Set<string> {
    const GRAMS = new Set<string>();
    for (let index = 0; index <= value.length - GRAM_LENGTH; index += 1) {
        GRAMS.add(value.slice(index, index + GRAM_LENGTH));
    }
    return GRAMS;
}

/** Scores shared terms, favoring titles that differ only by subtitles or editions. */
function wordSimilarity(query: string, candidate: string): number {
    const QUERY = new Set(query.split(" "));
    const CANDIDATE = new Set(candidate.split(" "));
    const COMMON = [...QUERY].filter((word) => CANDIDATE.has(word)).length;
    const DICE = (COMMON * DICE_MULTIPLIER) / (QUERY.size + CANDIDATE.size);
    if (COMMON < MIN_SHARED_WORDS && !singleTitleContained(QUERY, CANDIDATE)) {
        return DICE;
    }
    return Math.max(
        DICE,
        (CONTAINED_WORD_SCORE * COMMON) / Math.min(QUERY.size, CANDIDATE.size),
    );
}

/** Allows a distinctive one-word title to match an edition subtitle. */
function singleTitleContained(
    query: ReadonlySet<string>,
    candidate: ReadonlySet<string>,
): boolean {
    if (Math.min(query.size, candidate.size) !== 1) {
        return false;
    }
    return [...query].some(
        (word) =>
            candidate.has(word) &&
            word.length >= MIN_SIGNIFICANT_WORD_LENGTH &&
            !EDITION_WORDS.has(word),
    );
}

/** Combines word overlap with character similarity for misspellings and transpositions. */
export function koboTitleSimilarity(query: string, candidate: string): number {
    if (query === "" || candidate === "") {
        return 0;
    }
    if (query === candidate) {
        return 1;
    }
    const QUERY_GRAMS = characterGrams(query);
    const CANDIDATE_GRAMS = characterGrams(candidate);
    const COMMON = [...QUERY_GRAMS].filter((gram) =>
        CANDIDATE_GRAMS.has(gram),
    ).length;
    const TOTAL = QUERY_GRAMS.size + CANDIDATE_GRAMS.size;
    return Math.max(
        (COMMON * DICE_MULTIPLIER) / Math.max(TOTAL, 1),
        wordSimilarity(query, candidate),
    );
}
