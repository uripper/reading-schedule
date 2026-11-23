/**
 * Refreshes the After Book menu from the typed text, ranking candidates by
 * their relation to the book as it currently stands in the form.
 */
import type { AfterBookRankContext, BookFormRefs } from "../../types/types.ts";
import type { CreateRefreshFilteredArgs } from "./after-book-picker-types.ts";
import { labelsMatch, optionLabel } from "./after_book_picker_helpers.ts";
import {
    FIRST_RESULT_INDEX,
    NO_ACTIVE_INDEX,
    selectedBook,
} from "./after_book_picker_render.ts";
import { rankAfterBookCandidates } from "./after_book_ranking.ts";
import { readCollectionSelection } from "./collection_picker.ts";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.ts";

const NOTHING_EXCLUDED: ReadonlySet<string> = new Set<string>();

/**
 * Reads the edited book's shelf and collections from the form, so ranking
 * follows unsaved changes.
 * @param refs - Book form references.
 * @returns Ranking context; options are already free of excluded books.
 */
function formRankContext(refs: BookFormRefs): AfterBookRankContext {
    let shelf = refs.shelfSelectInput.value;
    if (shelf === SHELF_SELECT_CREATE_NEW) {
        shelf = "";
    }
    return {
        collections: readCollectionSelection(refs),
        excludedIds: NOTHING_EXCLUDED,
        shelf,
    };
}

/**
 * Decides whether a query change invalidates the current selection.
 * @param args - Picker state and actions.
 * @param clearChangedSelection - Whether typing may clear the selection.
 * @param query - Trimmed typed text.
 * @returns `true` when the text no longer names the selected book.
 */
function shouldClearChangedSelection(
    args: CreateRefreshFilteredArgs,
    clearChangedSelection: boolean,
    query: string,
): boolean {
    if (!clearChangedSelection) {
        return false;
    }
    const CURRENT = selectedBook(args.state);
    if (!(query && CURRENT && labelsMatch(query, optionLabel(CURRENT)))) {
        return true;
    }
    return false;
}

/**
 * Picks the highlighted row after the list changes.
 * @param count - Number of rows.
 * @returns First row, or none when empty.
 */
function nextActiveIndex(count: number): number {
    if (count === 0) {
        return NO_ACTIVE_INDEX;
    }
    return FIRST_RESULT_INDEX;
}

/**
 * Text used to filter: none while the field still shows the chosen book, so
 * reopening the menu lists every candidate.
 * @param args - Picker state and refs.
 * @param query - Trimmed typed text.
 * @returns Filter text.
 */
function filterQuery(args: CreateRefreshFilteredArgs, query: string): string {
    const CURRENT = selectedBook(args.state);
    if (CURRENT !== null && labelsMatch(query, optionLabel(CURRENT))) {
        return "";
    }
    return query;
}

/**
 * Creates the query-refresh handler used by focus, typing, and arrows.
 * @param args - Picker state and actions.
 * @returns Handler; pass `true` when typing may clear the selection.
 */
export function createRefreshFiltered(
    args: CreateRefreshFilteredArgs,
): (clearChangedSelection: boolean) => void {
    return (clearChangedSelection: boolean): void => {
        const QUERY = args.refs.afterBookInput.value.trim();
        if (shouldClearChangedSelection(args, clearChangedSelection, QUERY)) {
            args.clearSelection();
        }
        const STATE = args.state;
        STATE.filtered = rankAfterBookCandidates(
            STATE.options,
            formRankContext(args.refs),
            filterQuery(args, QUERY),
        );
        STATE.activeIndex = nextActiveIndex(STATE.filtered.length);
        args.render();
    };
}
