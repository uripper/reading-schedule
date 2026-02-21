import { shelfLabelForBook } from "./shelf.js";
import { titleInitialLetter } from "./title_key.js";
import type { Book } from "./types.js";
import { finishDateMetaForBook, type GroupMeta } from "./grouping_finish.js";

export const GROUP_BY_NONE = "none";
export const GROUP_BY_SHELF = "shelf";
export const GROUP_BY_FINISH_DATE = "finish_date";
export const GROUP_BY_TITLE_LETTER = "title_letter";
export const GROUP_BY_AUTHOR = "author";

export type BookGroupBy =
  | typeof GROUP_BY_NONE
  | typeof GROUP_BY_SHELF
  | typeof GROUP_BY_FINISH_DATE
  | typeof GROUP_BY_TITLE_LETTER
  | typeof GROUP_BY_AUTHOR;

type GroupBucket = GroupMeta & {
  books: Book[];
};

export type BookGroup = {
  key: string;
  label: string;
  books: Book[];
};

const UNKNOWN_AUTHOR_LABEL = "Unknown Author";
const TITLE_MISC_LABEL = "#";
const TITLE_MISC_KEY = "title:#";

const TITLE_MISC_ORDER = 2;
const TITLE_LETTER_ORDER = 1;

function normalizedText(value?: string | number): string {
  return String(value || "").trim();
}

function compareTextInsensitive(left: string, right: string): number {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    sensitivity: "base",
  });
}

function titleLetterMetaForBook(book: Book): GroupMeta {
  const first = titleInitialLetter(book?.title);
  if (!first) {
    return {
      key: TITLE_MISC_KEY,
      label: TITLE_MISC_LABEL,
      order: TITLE_MISC_ORDER,
      tie: TITLE_MISC_LABEL,
    };
  }

  if (!/^[A-Z]$/.test(first)) {
    return {
      key: TITLE_MISC_KEY,
      label: TITLE_MISC_LABEL,
      order: TITLE_MISC_ORDER,
      tie: TITLE_MISC_LABEL,
    };
  }

  return {
    key: `title:${first}`,
    label: first,
    order: TITLE_LETTER_ORDER,
    tie: first,
  };
}

function authorMetaForBook(book: Book): GroupMeta {
  const author = normalizedText(book?.author);
  if (!author) {
    return {
      key: `author:${UNKNOWN_AUTHOR_LABEL}`,
      label: UNKNOWN_AUTHOR_LABEL,
      order: TITLE_LETTER_ORDER,
      tie: UNKNOWN_AUTHOR_LABEL,
    };
  }

  return {
    key: `author:${author}`,
    label: author,
    order: TITLE_LETTER_ORDER,
    tie: author,
  };
}

function shelfMetaForBook(book: Book): GroupMeta {
  const shelfLabel = shelfLabelForBook(book);
  return {
    key: `shelf:${shelfLabel}`,
    label: shelfLabel,
    order: TITLE_LETTER_ORDER,
    tie: shelfLabel,
  };
}

function metaForBook(
  book: Book,
  groupBy: BookGroupBy,
  finishDateByBookId: Record<string, string>,
  currentYear: number,
): GroupMeta {
  if (groupBy === GROUP_BY_SHELF) {
    return shelfMetaForBook(book);
  }
  if (groupBy === GROUP_BY_FINISH_DATE) {
    return finishDateMetaForBook(book, finishDateByBookId, currentYear);
  }
  if (groupBy === GROUP_BY_TITLE_LETTER) {
    return titleLetterMetaForBook(book);
  }
  return authorMetaForBook(book);
}

function compareGroups(left: GroupBucket, right: GroupBucket): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }
  const tieCompare = compareTextInsensitive(left.tie, right.tie);
  if (tieCompare !== 0) {
    return tieCompare;
  }
  return compareTextInsensitive(left.label, right.label);
}

function groupedBuckets(
  books: Book[],
  groupBy: BookGroupBy,
  finishDateByBookId: Record<string, string>,
  currentYear: number,
): Map<string, GroupBucket> {
  const buckets = new Map<string, GroupBucket>();
  books.forEach((book: Book) => {
    const meta = metaForBook(book, groupBy, finishDateByBookId, currentYear);
    if (!buckets.has(meta.key)) {
      buckets.set(meta.key, { ...meta, books: [] });
    }
    const bucket = buckets.get(meta.key);
    if (bucket) {
      bucket.books.push(book);
    }
  });
  return buckets;
}

export function groupBooks(
  books: Book[] = [],
  groupBy: BookGroupBy = GROUP_BY_NONE,
  finishDateByBookId: Record<string, string> = {},
): BookGroup[] {
  if (groupBy === GROUP_BY_NONE) {
    return [];
  }

  const currentYear = new Date().getFullYear();
  const buckets = groupedBuckets(
    books,
    groupBy,
    finishDateByBookId,
    currentYear,
  );
  return [...buckets.values()].sort(compareGroups).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    books: bucket.books,
  }));
}
