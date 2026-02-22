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
import type { Book } from "./types.js";

export interface OptionDefinition {
  label: string;
  value: string;
}

export const SORT_OPTIONS: OptionDefinition[] = [
  { value: SORT_BY_TITLE, label: "Title" },
  { value: SORT_BY_AUTHOR, label: "Author" },
  { value: SORT_BY_ESTIMATED_FINISH, label: "Estimated Finish" },
  { value: SORT_BY_PAGES_TOTAL, label: "Pages" },
  { value: SORT_BY_PAGES_READ, label: "Pages Read" },
  { value: SORT_BY_WORDS_TOTAL, label: "Words" },
  { value: SORT_BY_PROGRESS, label: "Progress" },
  { value: SORT_BY_PRIORITY, label: "Priority" },
  { value: SORT_BY_DIFFICULTY, label: "Difficulty" },
  { value: SORT_BY_DEADLINE, label: "Deadline" },
  { value: SORT_BY_SHELF, label: "Shelf" },
];

export const GROUP_OPTIONS_BASE: OptionDefinition[] = [
  { value: GROUP_BY_NONE, label: "None" },
  { value: GROUP_BY_FINISH_DATE, label: "Finish Date" },
  { value: GROUP_BY_TITLE_LETTER, label: "Title Letter" },
  { value: GROUP_BY_AUTHOR, label: "Author" },
];

const GROUP_OPTION_SHELF: OptionDefinition = {
  value: GROUP_BY_SHELF,
  label: "Shelves",
};

/**
 *
 * @param shelfFilter
 */
export function groupOptionsForShelfFilter(
  shelfFilter: string,
): OptionDefinition[] {
  const options = [...GROUP_OPTIONS_BASE];
  if (shelfFilter === SHELF_FILTER_ALL) {
    options.splice(1, 0, GROUP_OPTION_SHELF);
  }
  return options;
}

/**
 *
 * @param books
 */
export function shelfFilterOptions(books: Book[]): OptionDefinition[] {
  const options: OptionDefinition[] = [
    { value: SHELF_FILTER_ALL, label: "All Shelves" },
    { value: SHELF_FILTER_UNSHELVED, label: "Unshelved" },
  ];
  uniqueShelves(books).forEach((shelfName) => {
    options.push({ value: shelfName, label: shelfName });
  });
  return options;
}
