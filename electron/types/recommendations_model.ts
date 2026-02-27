import type { PlannerApi } from "./planner_api.js";

export interface RecommendationSeed {
  title: string;
  wordsTotal: number;
}

export interface RecommendationItem {
  author: string;
  coverUrl: string;
  title: string;
  wordsTotal: number;
}

export interface RecommendationFormTarget {
  shelfInput: HTMLSelectElement;
  titleInput: HTMLInputElement;
  authorInput: HTMLInputElement;
  wordsInput: HTMLInputElement;
}

export interface RenderRecommendationsArgs {
  recommendations: RecommendationItem[];
  onAddToShelf(recommendation: RecommendationItem): void;
}

export type RecommendationSearchApi = Pick<PlannerApi, "searchBooks">;
