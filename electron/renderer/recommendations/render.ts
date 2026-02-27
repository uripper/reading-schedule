import { el } from "../dom.js";
import { COVER_PLACEHOLDER } from "../books/constants.js";
import type {
  RecommendationItem,
  RenderRecommendationsArgs,
} from "../../types/types_experience.js";

const EMPTY_SUMMARY_TEXT =
  "Read books by your favorite authors to unlock recommendations.";

const NON_EMPTY_SUMMARY_PREFIX = "Recommendations based on authors you've finished:";

const ADD_TO_SHELF_BUTTON_TEXT = "Add to shelf";

/**
 * Creates one recommendation card with an add-to-shelf action.
 * @param recommendation Recommendation values for the card.
 * @param onAddToShelf Callback used when the add button is clicked.
 * @returns Rendered recommendation card.
 */
function createRecommendationCard(
  recommendation: RecommendationItem,
  onAddToShelf: (recommendation: RecommendationItem) => void,
): HTMLElement {
  const card = document.createElement("article");
  card.className = "book-card";

  const cover = document.createElement("div");
  cover.className = "book-cover";
  const coverImage = document.createElement("img");
  coverImage.className = "book-cover-img";
  coverImage.loading = "lazy";
  coverImage.alt = `Cover of ${recommendation.title}`;
  coverImage.src = COVER_PLACEHOLDER;
  const recommendationCoverUrl = recommendation.coverUrl.trim();
  if (recommendationCoverUrl.length > 0) {
    coverImage.src = recommendationCoverUrl;
  }
  coverImage.addEventListener("error", () => {
    coverImage.src = COVER_PLACEHOLDER;
  });
  cover.append(coverImage);

  const title = document.createElement("h3");
  title.className = "book-title";
  title.textContent = recommendation.title;

  const author = document.createElement("p");
  author.className = "book-meta";
  author.textContent = recommendation.author;

  const words = document.createElement("p");
  words.className = "book-meta";
  words.textContent = `Estimated words: ${recommendation.wordsTotal.toLocaleString()}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn";
  button.textContent = ADD_TO_SHELF_BUTTON_TEXT;
  button.addEventListener("click", () => {
    onAddToShelf(recommendation);
  });

  card.append(cover, title, author, words, button);
  return card;
}

/**
 * Builds recommendations panel summary text from current recommendation results.
 * @param recommendations Current recommendation rows.
 * @returns User-facing summary text.
 */
function summaryText(recommendations: RecommendationItem[]): string {
  if (recommendations.length === 0) {
    return EMPTY_SUMMARY_TEXT;
  }
  const uniqueAuthors = new Set<string>();
  for (const recommendation of recommendations) {
    uniqueAuthors.add(recommendation.author);
  }
  const authorList = Array.from(uniqueAuthors).sort((leftAuthor, rightAuthor) => {
    return leftAuthor.localeCompare(rightAuthor);
  });
  if (authorList.length > 6) {
    const firstSixAuthors = authorList.slice(0, 6).join(", ");
    const remainingCount = authorList.length - 6;
    return `${NON_EMPTY_SUMMARY_PREFIX} ${firstSixAuthors} + ${remainingCount} more.`;
  }
  return `${NON_EMPTY_SUMMARY_PREFIX} ${authorList.join(", ")}.`;
}

/**
 * Renders recommendation cards for read authors and wires add-to-shelf actions.
 * @param args Render dependencies.
 * @param args.recommendations Existing recommendation candidates.
 * @param args.onAddToShelf Action called when user adds one recommendation.
 */
export function renderRecommendationsPanel(args: RenderRecommendationsArgs): void {
  const handleAddToShelf = (recommendation: RecommendationItem): void => {
    args.onAddToShelf(recommendation);
  };
  const recommendations = args.recommendations;
  const listNode = el("recommendationsList");
  const summaryNode = el("recommendationsSummary");
  const emptyNode = el("recommendationsEmpty");

  summaryNode.textContent = summaryText(recommendations);
  if (recommendations.length === 0) {
    listNode.replaceChildren();
    emptyNode.hidden = false;
    return;
  }

  const cards = recommendations.map((recommendation) => {
    return createRecommendationCard(recommendation, handleAddToShelf);
  });
  listNode.replaceChildren(...cards);
  emptyNode.hidden = true;
}
