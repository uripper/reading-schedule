import type { BookGroupBy, SortBy } from "../../types/types.js";
import {
    GROUP_BY_AUTHOR,
    GROUP_BY_FINISH_DATE,
    GROUP_BY_NONE,
    GROUP_BY_SHELF,
    GROUP_BY_TITLE_LETTER,
} from "./grouping.js";
import { SHELF_FILTER_ALL, SHELF_FILTER_UNSHELVED } from "./shelf.js";
import {
    SORT_BY_AUTHOR,
    SORT_BY_DEADLINE,
    SORT_BY_DIFFICULTY,
    SORT_BY_ESTIMATED_FINISH,
    SORT_BY_PAGES_READ,
    SORT_BY_PAGES_TOTAL,
    SORT_BY_PRIORITY,
    SORT_BY_PROGRESS,
    SORT_BY_SHELF,
    SORT_BY_WORDS_TOTAL,
} from "./sort.js";
import { SORT_BY_TITLE } from "./toolbar.js";

const SORT_BY_OPTIONS: SortBy[] = [
    SORT_BY_TITLE,
    SORT_BY_AUTHOR,
    SORT_BY_ESTIMATED_FINISH,
    SORT_BY_PAGES_TOTAL,
    SORT_BY_PAGES_READ,
    SORT_BY_WORDS_TOTAL,
    SORT_BY_PROGRESS,
    SORT_BY_PRIORITY,
    SORT_BY_DIFFICULTY,
    SORT_BY_DEADLINE,
    SORT_BY_SHELF,
];

const GROUP_BY_OPTIONS: BookGroupBy[] = [
    GROUP_BY_NONE,
    GROUP_BY_SHELF,
    GROUP_BY_FINISH_DATE,
    GROUP_BY_TITLE_LETTER,
    GROUP_BY_AUTHOR,
];

/**
 * Converts toolbar sort value into a supported sort option.
 * @param value Raw value read from sort-by select control.
 * @returns Matching sort option or title sort when value is unsupported.
 */
export function toSortBy(value: string): SortBy {
    const matched = SORT_BY_OPTIONS.find((option) => option === value);
    if (matched) {
        return matched;
    }
    return SORT_BY_TITLE;
}

/**
 * Converts toolbar group value into a supported group option.
 * @param value Raw value read from group-by select control.
 * @returns Matching group option or no-group fallback when unsupported.
 */
export function toGroupBy(value: string): BookGroupBy {
    const matched = GROUP_BY_OPTIONS.find((option) => option === value);
    if (matched) {
        return matched;
    }
    return GROUP_BY_NONE;
}

/**
 * Resolves which shelf should be preselected when opening the add-book dialog.
 * @param currentShelfFilter Currently active shelf filter in the toolbar.
 * @returns Shelf id for new books, or empty string when filter is global/unshelved.
 */
export function defaultShelfForAddDialog(currentShelfFilter: string): string {
    if (
        currentShelfFilter === SHELF_FILTER_ALL ||
        currentShelfFilter === SHELF_FILTER_UNSHELVED
    ) {
        return "";
    }
    return currentShelfFilter;
}
