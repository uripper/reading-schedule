import type { LookupSearchState } from "./search.js";

export interface LookupInputHandlerArgs {
  searchInput: HTMLInputElement;
  metaEl: HTMLElement;
  state: LookupSearchState;
  clearResults(this: void): void;
  refreshResults(this: void): void;
}
