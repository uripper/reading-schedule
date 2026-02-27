import type { BooksControllerRefs, BooksViewState } from "../../renderer/books/controller_types.js";

export interface BindToolbarEventsArgs {
  refs: BooksControllerRefs;
  viewState: BooksViewState;
  rerender(): void;
}
