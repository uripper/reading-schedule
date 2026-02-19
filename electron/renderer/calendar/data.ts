
import { sortRowsByDateAndSession } from "./utils.js";

type CalendarRow = {
  book_id: string;
  date: string;
  session_index: string | number;
  words_planned?: number;
  [key: string]: unknown;
};

type CalendarRowWithFinish = CalendarRow & {
  finish: boolean;
};

type RowsByDate = Record<string, CalendarRowWithFinish[]>;

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function enrichRows(rows: CalendarRow[], totals: Record<string, number> = {}): CalendarRowWithFinish[] {
  const progressByBookId: Record<string, number> = {};
  const finishedByBookId: Record<string, boolean> = {};
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  return sortedRows.map((row) => {
    const rowDate = String(row.date || "");
    if (!rowDate || rowDate < today) {
      return { ...row, finish: false };
    }

    const bookId = String(row.book_id || "");
    const plannedWords = Number(row.words_planned || 0);
    const previousProgress = Number(progressByBookId[bookId] || 0);
    const nextProgress = previousProgress + plannedWords;
    progressByBookId[bookId] = nextProgress;

    const totalWords = Number(totals[bookId] || 0);
    let finishesBook = false;
    if (bookId && totalWords > 0) {
      const alreadyFinished = Boolean(finishedByBookId[bookId]);
      if (!alreadyFinished && nextProgress >= totalWords) {
        finishesBook = true;
        finishedByBookId[bookId] = true;
      }
    }
    return { ...row, finish: finishesBook };
  });
}

export function groupRowsByDate(rows: CalendarRowWithFinish[] = []): RowsByDate {
  return rows.reduce((accumulator, row) => {
    accumulator[row.date] ||= [];
    accumulator[row.date].push(row);
    return accumulator;
  }, {} as RowsByDate);
}

export function monthKeysFromRows(rows: CalendarRowWithFinish[] = []): string[] {
  const monthKeySet = new Set(rows.map((row) => row.date.slice(0, 7)));
  return [...monthKeySet].sort();
}

export function firstPlannedRow(rows: CalendarRow[] = []): CalendarRow | null {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  const upcoming = sortedRows.find((row) => String(row?.date || "") >= today);
  return upcoming || sortedRows[0] || null;
}
