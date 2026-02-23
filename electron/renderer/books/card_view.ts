import type { BookGroup } from "./grouping.js";
import type { Book } from "./types.js";
import { bindCardEvents } from "./card_events.js";
import { renderFlatBooks, renderGroupedBooks } from "./card_group_render.js";
import { titleByIdMap } from "./card_nodes.js";

interface RenderBookGridOptions {
  grid: HTMLElement;
  empty: HTMLElement;
  books: Book[];
  groups?: BookGroup[];
  allBooks?: Book[];
  finishDateByBookId?: Record<string, string>;
  onEstimatedFinishNavigate(dateKey: string): void;
  showShelfMeta?: boolean;
  onEdit(bookId: string): void;
  onRemove(bookId: string): void;
}

/**
 * Renders book cards (grouped or flat) and wires edit/remove handlers.
 * @param root0 Render options and callbacks.
 * @param root0.grid Card grid container element.
 * @param root0.empty Empty-state element.
 * @param root0.books Books to render.
 * @param root0.groups Optional grouped book structure.
 * @param root0.allBooks Optional full book catalog for metadata lookup.
 * @param root0.finishDateByBookId Optional finish-date lookup.
 * @param root0.onEstimatedFinishNavigate
 * @param root0.showShelfMeta Whether shelf metadata should be displayed.
 * @param root0.onEdit Edit callback for a book id.
 * @param root0.onRemove Remove callback for a book id.
 */
export function renderBookGrid({
  grid,
  empty,
  books,
  groups = [],
  allBooks = [],
  finishDateByBookId = {},
  onEstimatedFinishNavigate,
  showShelfMeta = true,
  onEdit,
  onRemove,
}: RenderBookGridOptions): void {
  const context = {
    finishDateByBookId,
    onEstimatedFinishNavigate,
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
