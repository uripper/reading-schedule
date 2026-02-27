import type { BookLookupItem } from "./search.js";

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
