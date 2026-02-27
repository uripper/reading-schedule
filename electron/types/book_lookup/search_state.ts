import type { BookLookupItem } from "../types.js";

export interface LookupState {
  currentItems: BookLookupItem[];
  activeIndex: number;
}

export interface CreateLookupStateControllerArgs {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(this: void, item: BookLookupItem): void;
  placeholder: string;
  state: LookupState;
}

export interface LookupStateController {
  clearResults(): void;
  refreshResults(): void;
  selectItem(index: number): void;
  setActiveIndex(index: number): void;
}
