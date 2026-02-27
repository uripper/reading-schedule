import type { Book } from "../../renderer/books/types.js";

export type GetBooks = () => Book[];

export interface AfterBookPicker {
  openForBook(book?: Book | null): void;
}
