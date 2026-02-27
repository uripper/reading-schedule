import type { BookLookupItem } from "../types.js";

export interface LookupState {
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  currentItems: BookLookupItem[];
  activeIndex: number;
}

export interface LookupInputHandlerArgs {
  searchInput: HTMLInputElement;
  metaEl: HTMLElement;
  state: LookupState;
  clearResults(this: void): void;
  refreshResults(this: void): void;
}
