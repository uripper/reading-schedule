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

export interface BindBookLookupOptions {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(this: void, item: BookLookupItem): void;
}

export interface LookupBinding {
  clearResults(): void;
  destroy(): void;
}
