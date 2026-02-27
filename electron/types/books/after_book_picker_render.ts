import type { Book } from "../../renderer/books/types.js";

export interface PickerState {
  activeIndex: number;
  currentBookId: string;
  filtered: Book[];
  options: Book[];
  selectedBookId: string;
}
