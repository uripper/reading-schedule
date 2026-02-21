import type { BookGroup } from "./grouping.js";
import type { Book } from "./types.js";
import { bindCardEvents } from "./card_events.js";
import { renderFlatBooks, renderGroupedBooks } from "./card_group_render.js";
import { titleByIdMap } from "./card_nodes.js";

type RenderBookGridOptions = {
  grid: HTMLElement;
  empty: HTMLElement;
  books: Book[];
  groups?: BookGroup[];
  allBooks?: Book[];
  finishDateByBookId?: Record<string, string>;
  showShelfMeta?: boolean;
  onEdit: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export function renderBookGrid({
  grid,
  empty,
  books,
  groups = [],
  allBooks = [],
  finishDateByBookId = {},
  showShelfMeta = true,
  onEdit,
  onRemove,
}: RenderBookGridOptions): void {
  const context = {
    finishDateByBookId,
    showShelfMeta,
    titleById: titleByIdMap(books, allBooks),
  };

  if (groups.length) {
    renderGroupedBooks(grid, groups, context);
  } else {
    renderFlatBooks(grid, books, context);
  }

  empty.style.display = "block";
  if (books.length) {
    empty.style.display = "none";
  }

  bindCardEvents(grid, { onEdit, onRemove });
}
