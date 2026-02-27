import type { GroupMeta } from "../../renderer/books/grouping_finish.js";
import type { GROUP_BY_AUTHOR, GROUP_BY_FINISH_DATE, GROUP_BY_NONE, GROUP_BY_SHELF, GROUP_BY_TITLE_LETTER } from "../../renderer/books/grouping.js";
import type { Book } from "../../renderer/books/types.js";

export type BookGroupBy =
  | typeof GROUP_BY_NONE
  | typeof GROUP_BY_SHELF
  | typeof GROUP_BY_FINISH_DATE
  | typeof GROUP_BY_TITLE_LETTER
  | typeof GROUP_BY_AUTHOR;

export type GroupBucket = GroupMeta & {
  books: Book[];
};

export interface BookGroup {
  key: string;
  label: string;
  books: Book[];
}
