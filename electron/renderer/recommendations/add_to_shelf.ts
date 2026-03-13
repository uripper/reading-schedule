import type {
    RecommendationFormTarget,
    RecommendationItem,
} from "../../types/types.ts";
import { el } from "../dom.ts";

const MIN_WORDS_TOTAL = 1;

/**
 * Normalizes recommendation word counts to a positive integer string.
 * @param wordsTotal - Suggested words-total value.
 * @returns Positive integer text for the add-book words field.
 */
function normalizedWordsTotal(wordsTotal: number): string {
    const ROUNDED_WORDS = Math.round(wordsTotal);
    if (ROUNDED_WORDS >= MIN_WORDS_TOTAL) {
        return String(ROUNDED_WORDS);
    }
    return String(MIN_WORDS_TOTAL);
}

/**
 * Applies recommendation values to the add-book form and focuses shelf selection.
 * @param target - Required add-book form references.
 * @param recommendation - Recommendation selected by the user.
 */
function submitRecommendationToShelf(
    target: RecommendationFormTarget,
    recommendation: RecommendationItem,
): void {
    const NEXT_TARGET = target;
    NEXT_TARGET.titleInput.value = recommendation.title;
    NEXT_TARGET.authorInput.value = recommendation.author;
    NEXT_TARGET.wordsInput.value = normalizedWordsTotal(
        recommendation.wordsTotal,
    );
    NEXT_TARGET.shelfInput.focus();
}

/**
 * Opens the add-book dialog and prefills recommendation fields for user review.
 * @param recommendation - Recommendation selected by the user.
 */
export function addRecommendationToShelf(
    recommendation: RecommendationItem,
): void {
    const ADD_BUTTON = el<HTMLButtonElement>("addBookBtn");
    ADD_BUTTON.click();
    submitRecommendationToShelf(
        {
            authorInput: el<HTMLInputElement>("bookFormAuthor"),
            shelfInput: el<HTMLSelectElement>("bookShelfSelectInput"),
            titleInput: el<HTMLInputElement>("bookTitleInput"),
            wordsInput: el<HTMLInputElement>("bookWordsInput"),
        },
        recommendation,
    );
}
