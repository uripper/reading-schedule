
import { shelfLabelForBook } from './shelf.js';
import type { Book } from './types.js';

export const GROUP_BY_NONE = 'none';
export const GROUP_BY_SHELF = 'shelf';
export const GROUP_BY_FINISH_DATE = 'finish_date';
export const GROUP_BY_TITLE_LETTER = 'title_letter';
export const GROUP_BY_AUTHOR = 'author';

export type BookGroupBy =
  | typeof GROUP_BY_NONE
  | typeof GROUP_BY_SHELF
  | typeof GROUP_BY_FINISH_DATE
  | typeof GROUP_BY_TITLE_LETTER
  | typeof GROUP_BY_AUTHOR;

type GroupMeta = {
  key: string;
  label: string;
  order: number;
  tie: string;
};

type GroupBucket = GroupMeta & {
  books: Book[];
};

export type BookGroup = {
  key: string;
  label: string;
  books: Book[];
};

const MONTH_INDEX_MIN = 1;
const MONTH_INDEX_MAX = 12;
const YEAR_MONTH_MULTIPLIER = 100;

const NO_ESTIMATED_FINISH_KEY = 'finish:none';
const NO_ESTIMATED_FINISH_LABEL = 'No estimated finish';
const UNKNOWN_AUTHOR_LABEL = 'Unknown Author';
const TITLE_MISC_LABEL = '#';
const TITLE_MISC_KEY = 'title:#';

const NO_ESTIMATED_FINISH_ORDER = Number.MAX_SAFE_INTEGER;
const TITLE_MISC_ORDER = 2;
const TITLE_LETTER_ORDER = 1;

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' });

function normalizedText(value: string | number | null | undefined): string {
  return String(value || '').trim();
}

function compareTextInsensitive(left: string, right: string): number {
  return String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
}

function parseFinishDateParts(
  dateText: string | null | undefined,
): { year: number; month: number; date: Date } | null {
  const raw = normalizedText(dateText);
  if (!raw) {
    return null;
  }

  const parts = raw.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  if (month < MONTH_INDEX_MIN || month > MONTH_INDEX_MAX) {
    return null;
  }

  return {
    year,
    month,
    date: new Date(year, month - MONTH_INDEX_MIN, MONTH_INDEX_MIN),
  };
}

function finishDateMetaForBook(
  book: Book,
  finishDateByBookId: Record<string, string>,
  currentYear: number,
): GroupMeta {
  const finishDate = parseFinishDateParts(finishDateByBookId?.[book.book_id]);
  if (!finishDate) {
    return {
      key: NO_ESTIMATED_FINISH_KEY,
      label: NO_ESTIMATED_FINISH_LABEL,
      order: NO_ESTIMATED_FINISH_ORDER,
      tie: NO_ESTIMATED_FINISH_LABEL,
    };
  }

  const monthLabel = monthLabelFormatter.format(finishDate.date);
  let label = monthLabel;
  if (finishDate.year !== currentYear) {
    label = `${monthLabel} ${finishDate.year}`;
  }

  return {
    key: `finish:${finishDate.year}-${String(finishDate.month).padStart(2, '0')}`,
    label,
    order: finishDate.year * YEAR_MONTH_MULTIPLIER + finishDate.month,
    tie: label,
  };
}

function titleLetterMetaForBook(book: Book): GroupMeta {
  const title = normalizedText(book?.title).toUpperCase();
  if (!title) {
    return {
      key: TITLE_MISC_KEY,
      label: TITLE_MISC_LABEL,
      order: TITLE_MISC_ORDER,
      tie: TITLE_MISC_LABEL,
    };
  }

  const first = title.slice(0, MONTH_INDEX_MIN);
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
  const buckets = groupedBuckets(books, groupBy, finishDateByBookId, currentYear);
  return [...buckets.values()].sort(compareGroups).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    books: bucket.books,
  }));
}
