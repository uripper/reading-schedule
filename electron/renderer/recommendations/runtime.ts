import { logError } from "@renderer/logger.ts";
import { getPlannerApi } from "../app/planner_api.ts";
import { collectAllBooks } from "../books.ts";
import { el } from "../dom.ts";
import { addRecommendationToShelf } from "./add_to_shelf.ts";
import { renderRecommendationsPanel } from "./render.ts";
import { findRecommendations } from "./search.ts";

/**
 * Renders the recommendations panel from the latest in-memory book collection.
 * @param refreshToken - Token for race-safe refresh ordering.
 * @param getRefreshToken - Function that returns the latest refresh token.
 */
async function refreshRecommendationsPanel(
    refreshToken: number,
    getRefreshToken: () => number,
): Promise<void> {
    const BOOKS = collectAllBooks();
    const RECOMMENDATIONS = await findRecommendations(BOOKS, getPlannerApi());
    if (refreshToken !== getRefreshToken()) {
        return;
    }
    renderRecommendationsPanel({
        onAddToShelf: (recommendation) => {
            addRecommendationToShelf(recommendation);
        },
        recommendations: RECOMMENDATIONS,
    });
}

/**
 * Initializes recommendations rendering with manual fetch on button click.
 */
export function initRecommendationsRuntime(): void {
    let refreshToken = 0;
    const NEXT_REFRESH_TOKEN = (): number => {
        refreshToken += 1;
        return refreshToken;
    };
    const GET_REFRESH_TOKEN = (): number => {
        return refreshToken;
    };
    const QUEUE_REFRESH = async (): Promise<void> => {
        const ACTIVE_TOKEN = NEXT_REFRESH_TOKEN();
        await refreshRecommendationsPanel(ACTIVE_TOKEN, GET_REFRESH_TOKEN);
    };
    const GET_RECOMMENDATIONS_BTN = el("getRecommendationsBtn");
    GET_RECOMMENDATIONS_BTN.addEventListener("click", () => {
        QUEUE_REFRESH().catch((error: unknown) => {
            logError("Failed to refresh recommendations", error);
        });
    });
}
