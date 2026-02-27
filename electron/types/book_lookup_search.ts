import type { NumericLike } from "./types_core.js";

export interface BookLookupItem {
  title?: string;
  author?: string;
  year?: string | number;
  source?: string;
  cover_url?: string;
  words_estimate?: number;
  pages_estimate?: number;
}

export interface LookupSearchState {
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  currentItems: BookLookupItem[];
  activeIndex: number;
}

export interface LookupBinding {
  clearResults(): void;
  destroy(): void;
}

export interface BindBookLookupOptions {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(this: void, item: BookLookupItem): void;
}

export interface ProgressSyncInputs {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
}

export type ProgressField = "pages" | "progress";

export interface LookupInputHandlerArgs {
  searchInput: HTMLInputElement;
  metaEl: HTMLElement;
  state: LookupSearchState;
  clearResults(this: void): void;
  refreshResults(this: void): void;
}

export type SetActiveIndex = (index: number) => void;

export type SelectItem = (index: number) => void;

export interface HandleLookupKeydownArgs {
  event: KeyboardEvent;
  currentItems: readonly BookLookupItem[];
  activeIndex: number;
  setActiveIndex: SetActiveIndex;
  selectItem: SelectItem;
  clearResults(): void;
  searchInput: HTMLInputElement;
}

export interface LookupRenderState {
  currentItems: BookLookupItem[];
  activeIndex: number;
}

export interface CreateLookupStateControllerArgs {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(this: void, item: BookLookupItem): void;
  placeholder: string;
  state: LookupRenderState;
}

export interface LookupStateController {
  clearResults(): void;
  refreshResults(): void;
  selectItem(index: number): void;
  setActiveIndex(index: number): void;
}

export type { NumericLike };
