import type { BookLookupItem } from "../types.js";

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
