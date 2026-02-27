import { collectAllBooks } from "../books.js";
import { el } from "../dom.js";
import { getPlannerApi } from "../app/planner_state.js";
import { logError } from "../logger.js";
import { addRecommendationToShelf } from "./add_to_shelf.js";
import { renderRecommendationsPanel } from "./render.js";
import { findRecommendations } from "./search.js";

/**
 * Renders the recommendations panel from the latest in-memory book collection.
 * @param refreshToken Token for race-safe refresh ordering.
 * @param getRefreshToken Function that returns the latest refresh token.
 */
async function refreshRecommendationsPanel(
  refreshToken: number,
  getRefreshToken: () => number,
): Promise<void> {
  const books = collectAllBooks();
  const recommendations = await findRecommendations(books, getPlannerApi());
  if (refreshToken !== getRefreshToken()) {
    return;
  }
  renderRecommendationsPanel({
    recommendations,
    onAddToShelf: (recommendation) => {
      addRecommendationToShelf(recommendation);
    },
  });
}

/**
 * Initializes recommendations rendering and keeps it synced to books-grid updates.
 */
export function initRecommendationsRuntime(): void {
  let refreshToken = 0;
  const nextRefreshToken = (): number => {
    refreshToken += 1;
    return refreshToken;
  };
  const getRefreshToken = (): number => {
    return refreshToken;
  };
  const queueRefresh = async (): Promise<void> => {
    const activeToken = nextRefreshToken();
    await refreshRecommendationsPanel(activeToken, getRefreshToken);
  };
  queueRefresh().catch((error: unknown) => {
    logError("Failed to refresh recommendations", error);
  });
  const booksGrid = el("booksGrid");
  const observer = new MutationObserver(() => {
    queueRefresh().catch((error: unknown) => {
      logError("Failed to refresh recommendations", error);
    });
  });
  observer.observe(booksGrid, {
    childList: true,
    subtree: true,
  });
}
