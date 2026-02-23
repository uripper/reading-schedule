import { el } from "../dom.js";
import type { RecommendationItem } from "./model.js";

const MIN_WORDS_TOTAL = 1;

interface RecommendationFormTarget {
  form: HTMLFormElement;
  titleInput: HTMLInputElement;
  authorInput: HTMLInputElement;
  wordsInput: HTMLInputElement;
}

/**
 * Normalizes recommendation word counts to a positive integer string.
 * @param wordsTotal Suggested words-total value.
 * @returns Positive integer text for the add-book words field.
 */
function normalizedWordsTotal(wordsTotal: number): string {
  const roundedWords = Math.round(wordsTotal);
  if (roundedWords >= MIN_WORDS_TOTAL) {
    return String(roundedWords);
  }
  return String(MIN_WORDS_TOTAL);
}

/**
 * Applies recommendation values to the add-book form and submits it.
 * @param target Required add-book form references.
 * @param recommendation Recommendation selected by the user.
 */
export function submitRecommendationToShelf(
  target: RecommendationFormTarget,
  recommendation: RecommendationItem,
): void {
  const nextTarget = target;
  nextTarget.titleInput.value = recommendation.title;
  nextTarget.authorInput.value = recommendation.author;
  nextTarget.wordsInput.value = normalizedWordsTotal(recommendation.wordsTotal);
  nextTarget.form.requestSubmit();
}

/**
 * Opens the add-book dialog, fills recommendation values, and submits to shelf.
 * @param recommendation Recommendation selected by the user.
 */
export function addRecommendationToShelf(
  recommendation: RecommendationItem,
): void {
  const addButton = el<HTMLButtonElement>("addBookBtn");
  addButton.click();
  submitRecommendationToShelf(
    {
      form: el<HTMLFormElement>("bookForm"),
      titleInput: el<HTMLInputElement>("bookTitleInput"),
      authorInput: el<HTMLInputElement>("bookFormAuthor"),
      wordsInput: el<HTMLInputElement>("bookWordsInput"),
    },
    recommendation,
  );
}
