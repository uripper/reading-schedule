import type { RecommendationItem } from "../../renderer/recommendations/model.js";

export interface RenderRecommendationsArgs {
  recommendations: RecommendationItem[];
  onAddToShelf(recommendation: RecommendationItem): void;
}
