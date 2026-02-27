export type NumericLike = string | number | null | undefined;

export interface ProgressSyncInputs {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
}

export type ProgressField = "pages" | "progress";
