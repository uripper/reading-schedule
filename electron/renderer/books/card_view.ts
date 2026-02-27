

import { bindCardEvents } from "./card_events.js";
import { renderFlatBooks, renderGroupedBooks } from "./card_group_render.js";
import { titleByIdMap } from "./title_lookup.js";
import type { RenderBookGridOptions } from "../../types/books_types.js";

/**
 * Renders book cards (grouped or flat) and wires edit/remove handlers.
 * @param args Render options and callbacks.
 * @param args.grid Card grid container element.
 * @param args.empty Empty-state element.
 * @param args.books Books to render.
 * @param args.groups Optional grouped book structure.
 * @param args.allBooks Optional full book catalog for metadata lookup.
 * @param args.finishDateByBookId Optional finish-date lookup.
 * @param args.onEstimatedFinishNavigate Navigates to the selected finish date.
 * @param args.showShelfMeta Whether shelf metadata should be displayed.
 * @param args.onEdit Edit callback for a book id.
 * @param args.onRemove Remove callback for a book id.
 */
export function renderBookGrid(args: RenderBookGridOptions): void {
  const groups = args.groups ?? [];
  const allBooks = args.allBooks ?? [];
  const finishDateByBookId = args.finishDateByBookId ?? {};
  const showBlockerMeta = args.showBlockerMeta ?? true;
  const showShelfMeta = args.showShelfMeta ?? true;
  const showWordCount = args.showWordCount ?? true;
  const onEstimatedFinishNavigate = (dateKey: string): void => {
    args.onEstimatedFinishNavigate(dateKey);
  };
  const onEdit = (bookId: string): void => {
    args.onEdit(bookId);
  };
  const onRemove = (bookId: string): void => {
    args.onRemove(bookId);
  };
  const context = {
    finishDateByBookId,
    onEstimatedFinishNavigate,
    showBlockerMeta,
    showShelfMeta,
    showWordCount,
    titleById: titleByIdMap(args.books, allBooks),
  };

  if (groups.length) {
    renderGroupedBooks(args.grid, groups, context);
  } else {
    renderFlatBooks(args.grid, args.books, context);
  }

  const emptyState = args.empty;
  emptyState.style.display = "block";
  if (args.books.length) {
    emptyState.style.display = "none";
  }

  bindCardEvents(args.grid, { onEdit, onRemove });
}
