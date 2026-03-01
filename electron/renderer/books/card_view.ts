import { type RenderBookGridOptions } from "../../types/types.js";
import { bindCardEvents } from "./card_events.js";
import { renderFlatBooks, renderGroupedBooks } from "./card_group_render.js";
import { titleByIdMap } from "./title_lookup.js";

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
    const GROUPS = args.groups ?? [];
    const ALL_BOOKS = args.allBooks ?? [];
    const FINISH_DATE_BY_BOOK_ID = args.finishDateByBookId ?? {};
    const SHOW_BLOCKER_META = args.showBlockerMeta ?? true;
    const SHOW_SHELF_META = args.showShelfMeta ?? true;
    const SHOW_WORD_COUNT = args.showWordCount ?? true;
    const ON_ESTIMATED_FINISH_NAVIGATE = (dateKey: string): void => {
        args.onEstimatedFinishNavigate(dateKey);
    };
    const ON_EDIT = (bookId: string): void => {
        args.onEdit(bookId);
    };
    const ON_REMOVE = (bookId: string): void => {
        args.onRemove(bookId);
    };
    const CONTEXT = {
        finishDateByBookId: FINISH_DATE_BY_BOOK_ID,
        onEstimatedFinishNavigate: ON_ESTIMATED_FINISH_NAVIGATE,
        showBlockerMeta: SHOW_BLOCKER_META,
        showShelfMeta: SHOW_SHELF_META,
        showWordCount: SHOW_WORD_COUNT,
        titleById: titleByIdMap(args.books, ALL_BOOKS),
    };

    if (GROUPS.length) {
        renderGroupedBooks(args.grid, GROUPS, CONTEXT);
    } else {
        renderFlatBooks(args.grid, args.books, CONTEXT);
    }

    const EMPTY_STATE = args.empty;
    EMPTY_STATE.style.display = "block";
    if (args.books.length) {
        EMPTY_STATE.style.display = "none";
    }

    bindCardEvents(args.grid, { onEdit: ON_EDIT, onRemove: ON_REMOVE });
}
