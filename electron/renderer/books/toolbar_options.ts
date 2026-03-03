import type { Book, OptionDefinition } from "../../types/types.js";
import {
    GROUP_BY_AUTHOR,
    GROUP_BY_FINISH_DATE,
    GROUP_BY_NONE,
    GROUP_BY_SHELF,
    GROUP_BY_TITLE_LETTER,
} from "./grouping.js";
import {
    SHELF_FILTER_ALL,
    SHELF_FILTER_UNSHELVED,
    uniqueShelves,
} from "./shelf.js";
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
    SORT_BY_TITLE,
    SORT_BY_WORDS_TOTAL,
} from "./sort.js";

export const SORT_OPTIONS: OptionDefinition[] = [
    { label: "Title", value: SORT_BY_TITLE },
    { label: "Author", value: SORT_BY_AUTHOR },
    { label: "Estimated Finish", value: SORT_BY_ESTIMATED_FINISH },
    { label: "Pages", value: SORT_BY_PAGES_TOTAL },
    { label: "Pages Read", value: SORT_BY_PAGES_READ },
    { label: "Words", value: SORT_BY_WORDS_TOTAL },
    { label: "Progress", value: SORT_BY_PROGRESS },
    { label: "Priority", value: SORT_BY_PRIORITY },
    { label: "Difficulty", value: SORT_BY_DIFFICULTY },
    { label: "Deadline", value: SORT_BY_DEADLINE },
    { label: "Shelf", value: SORT_BY_SHELF },
];

export const GROUP_OPTIONS_BASE: OptionDefinition[] = [
    { label: "None", value: GROUP_BY_NONE },
    { label: "Finish Date", value: GROUP_BY_FINISH_DATE },
    { label: "Title Letter", value: GROUP_BY_TITLE_LETTER },
    { label: "Author", value: GROUP_BY_AUTHOR },
];

const GROUP_OPTION_SHELF: OptionDefinition = {
    label: "Shelves",
    value: GROUP_BY_SHELF,
};

/**
 * Returns group-by options adjusted for active shelf filter context.
 * @param shelfFilter Active shelf filter value.
 * @returns Group option definitions for toolbar render.
 */
export function groupOptionsForShelfFilter(
    shelfFilter: string,
): OptionDefinition[] {
    const OPTIONS = [...GROUP_OPTIONS_BASE];
    if (shelfFilter === SHELF_FILTER_ALL) {
        OPTIONS.splice(1, 0, GROUP_OPTION_SHELF);
    }
    return OPTIONS;
}

/**
 * Builds shelf filter options from known shelves in current book list.
 * @param books Books to scan for shelf names.
 * @returns Shelf filter option definitions for toolbar render.
 */
export function shelfFilterOptions(books: Book[]): OptionDefinition[] {
    const OPTIONS: OptionDefinition[] = [
        { label: "All Shelves", value: SHELF_FILTER_ALL },
        { label: "Unshelved", value: SHELF_FILTER_UNSHELVED },
    ];

    uniqueShelves(books).forEach((shelfName) => {
        OPTIONS.push({ label: shelfName, value: shelfName });
    });
    return OPTIONS;
}
