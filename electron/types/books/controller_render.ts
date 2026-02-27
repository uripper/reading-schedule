import type { BookDialogController, BooksControllerRefs, BooksViewState } from "../../renderer/books/controller_types.js";
import type { Book } from "../../renderer/books/types.js";
import type { PlannerScheduleRow } from "../types.js";

export interface RenderBooksControllerArgs {
  refs: BooksControllerRefs;
  books: Book[];
  scheduleRows: PlannerScheduleRow[];
  viewState: BooksViewState;
  dialog: BookDialogController | null;
  onBooksChanged(): void;
  onEstimatedFinishNavigate(dateKey: string): void;
  setBooks(nextBooks: Book[]): void;
  findBook(bookId: string): Book | null;
  rerender(): void;
}
