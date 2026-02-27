import type { BookGroup } from "../../renderer/books/grouping.js";
import type { Book } from "../../renderer/books/types.js";

export interface RenderBookGridOptions {
  grid: HTMLElement;
  empty: HTMLElement;
  books: Book[];
  groups?: BookGroup[];
  allBooks?: Book[];
  finishDateByBookId?: Record<string, string>;
  onEstimatedFinishNavigate(dateKey: string): void;
  showBlockerMeta?: boolean;
  showShelfMeta?: boolean;
  showWordCount?: boolean;
  onEdit(bookId: string): void;
  onRemove(bookId: string): void;
}
