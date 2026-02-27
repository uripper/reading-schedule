export type { NumericLike } from "../core/primitives.js";

export interface ProgressSyncInputs {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
}

export type ProgressField = "pages" | "progress";
