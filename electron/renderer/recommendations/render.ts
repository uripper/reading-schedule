import {
    type RecommendationItem,
    type RenderRecommendationsArgs,
} from "../../types/types.js";
import { COVER_PLACEHOLDER } from "../books/constants.js";
import { el } from "../dom.js";

const EMPTY_SUMMARY_TEXT =
    "Click 'Get Recommendations' to discover new books based on your reading list.";

const NON_EMPTY_SUMMARY_PREFIX =
    "Recommendations based on authors you've finished:";

const ADD_TO_SHELF_BUTTON_TEXT = "Add to shelf";

const GRID_LENGTH = 6;

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
    const CARD = document.createElement("article");
    CARD.className = "book-card";

    const COVER = document.createElement("div");
    COVER.className = "book-cover";
    const COVER_IMAGE = document.createElement("img");
    COVER_IMAGE.className = "book-cover-img";
    COVER_IMAGE.loading = "lazy";
    COVER_IMAGE.alt = `Cover of ${recommendation.title}`;
    COVER_IMAGE.src = COVER_PLACEHOLDER;
    const RECOMMENDATION_COVER_URL = recommendation.coverUrl.trim();
    if (RECOMMENDATION_COVER_URL.length > 0) {
        COVER_IMAGE.src = RECOMMENDATION_COVER_URL;
    }
    COVER_IMAGE.addEventListener("error", () => {
        COVER_IMAGE.src = COVER_PLACEHOLDER;
    });
    COVER.append(COVER_IMAGE);

    const TITLE = document.createElement("h3");
    TITLE.className = "book-title";
    TITLE.textContent = recommendation.title;

    const AUTHOR = document.createElement("p");
    AUTHOR.className = "book-meta";
    AUTHOR.textContent = recommendation.author;

    const WORDS = document.createElement("p");
    WORDS.className = "book-meta";
    WORDS.textContent = `Estimated words: ${recommendation.wordsTotal.toLocaleString()}`;

    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn";
    BUTTON.textContent = ADD_TO_SHELF_BUTTON_TEXT;
    BUTTON.addEventListener("click", () => {
        onAddToShelf(recommendation);
    });

    CARD.append(COVER, TITLE, AUTHOR, WORDS, BUTTON);
    return CARD;
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
    const UNIQUE_AUTHORS = new Set<string>();
    for (const RECOMMENDATION of recommendations) {
        UNIQUE_AUTHORS.add(RECOMMENDATION.author);
    }
    const AUTHOR_LIST = Array.from(UNIQUE_AUTHORS).sort(
        (leftAuthor, rightAuthor) => {
            return leftAuthor.localeCompare(rightAuthor);
        },
    );
    if (AUTHOR_LIST.length > GRID_LENGTH) {
        const FIRST_AUTHORS = AUTHOR_LIST.slice(0, GRID_LENGTH).join(", ");
        const REMAINING_COUNT = AUTHOR_LIST.length - GRID_LENGTH;
        return `${NON_EMPTY_SUMMARY_PREFIX} ${FIRST_AUTHORS} + ${REMAINING_COUNT} more.`;
    }
    return `${NON_EMPTY_SUMMARY_PREFIX} ${AUTHOR_LIST.join(", ")}.`;
}

/**
 * Renders recommendation cards for read authors and wires add-to-shelf actions.
 * @param args Render dependencies.
 * @param args.recommendations Existing recommendation candidates.
 * @param args.onAddToShelf Action called when user adds one recommendation.
 */
export function renderRecommendationsPanel(
    args: RenderRecommendationsArgs,
): void {
    const HANDLE_ADD_TO_SHELF = (recommendation: RecommendationItem): void => {
        args.onAddToShelf(recommendation);
    };
    const { recommendations } = args;
    const LIST_NODE = el("recommendationsList");
    const SUMMARY_NODE = el("recommendationsSummary");
    const EMPTY_NODE = el("recommendationsEmpty");

    SUMMARY_NODE.textContent = summaryText(recommendations);
    if (recommendations.length === 0) {
        LIST_NODE.replaceChildren();
        EMPTY_NODE.hidden = false;
        return;
    }

    const CARDS = recommendations.map((recommendation) => {
        return createRecommendationCard(recommendation, HANDLE_ADD_TO_SHELF);
    });
    LIST_NODE.replaceChildren(...CARDS);
    EMPTY_NODE.hidden = true;
}
