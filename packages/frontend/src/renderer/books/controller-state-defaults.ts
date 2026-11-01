/** Builds initial library controller references and view preferences. */
import type { BooksControllerRefs, BooksViewState } from "../../types/types.ts";
import { GROUP_BY_NONE } from "./grouping.ts";
import { SORT_BY_ESTIMATED_FINISH } from "./sort.ts";
import { BOOK_STATUS_FILTER_ALL } from "./status_catalog.ts";
import { SORT_DIRECTION_ASC } from "./toolbar.ts";

/** Creates empty DOM references before library UI binding. */
export function createBooksControllerRefs(): BooksControllerRefs {
    return {
        addBtn: null,
        empty: null,
        grid: null,
        groupBySelect: null,
        shelfFilterSelect: null,
        sortBySelect: null,
        sortDirectionBtn: null,
        statusFilterSelect: null,
        titleFilterInput: null,
        toolbar: null,
    };
}

/** Sets the existing library sort, grouping, and filter defaults. */
export function createBooksViewState(): BooksViewState {
    return {
        groupBy: GROUP_BY_NONE,
        shelfFilter: "",
        sortBy: SORT_BY_ESTIMATED_FINISH,
        sortDirection: SORT_DIRECTION_ASC,
        statusFilter: BOOK_STATUS_FILTER_ALL,
        titleFilter: "",
    };
}
