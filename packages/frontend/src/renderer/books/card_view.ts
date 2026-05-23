import type { RenderBookGridOptions } from "../../types/types.ts";
import { bindCardEvents } from "./card_events.ts";
import { renderFlatBooks, renderGroupedBooks } from "./card_group_render.ts";
import { titleByIdMap } from "./title_lookup.ts";

function createCardRenderContext(
    args: RenderBookGridOptions,
    allBooks: RenderBookGridOptions["allBooks"],
): Parameters<typeof renderFlatBooks>[2] {
    return {
        finishDateByBookId: args.finishDateByBookId ?? {},
        massEdit: args.massEdit,
        onEstimatedFinishNavigate: (dateKey: string): void => {
            args.onEstimatedFinishNavigate(dateKey);
        },
        showBlockerMeta: args.showBlockerMeta ?? true,
        showShelfMeta: args.showShelfMeta ?? true,
        showWordCount: args.showWordCount ?? true,
        titleById: titleByIdMap(args.books, allBooks ?? []),
    };
}

interface RenderBooksArgs {
    books: RenderBookGridOptions["books"];
    context: Parameters<typeof renderFlatBooks>[2];
    grid: HTMLElement;
    groups: RenderBookGridOptions["groups"];
}

function renderBooks(args: RenderBooksArgs): void {
    const GROUPS = args.groups ?? [];
    if (GROUPS.length > 0) {
        renderGroupedBooks(args.grid, GROUPS, args.context);
        return;
    }
    renderFlatBooks(args.grid, args.books, args.context);
}

function showEmptyState(
    empty: HTMLElement,
    books: RenderBookGridOptions["books"],
): void {
    const EMPTY_STATE = empty;
    EMPTY_STATE.style.display = "block";
    if (books.length > 0) {
        EMPTY_STATE.style.display = "none";
    }
}

function bindBookActions(args: {
    grid: HTMLElement;
    massEdit: RenderBookGridOptions["massEdit"];
    onEdit: RenderBookGridOptions["onEdit"];
    onRemove: RenderBookGridOptions["onRemove"];
}): void {
    bindCardEvents(args.grid, {
        onEdit: (bookId: string): void => {
            args.onEdit(bookId);
        },
        onMassEditSelection: args.massEdit?.onBookSelectionChange,
        onRemove: (bookId: string): void => {
            args.onRemove(bookId);
        },
    });
}

/**
 * Renders book cards (grouped or flat) and wires edit/remove handlers.
 * @param args - Render options and callbacks.
 */
export function renderBookGrid(args: RenderBookGridOptions): void {
    const GROUPS = args.groups ?? [];
    const ALL_BOOKS = args.allBooks ?? [];
    const CONTEXT = createCardRenderContext(args, ALL_BOOKS);
    renderBooks({
        books: args.books,
        context: CONTEXT,
        grid: args.grid,
        groups: GROUPS,
    });
    showEmptyState(args.empty, args.books);
    bindBookActions({
        grid: args.grid,
        massEdit: args.massEdit,
        onEdit: args.onEdit,
        onRemove: args.onRemove,
    });
}
