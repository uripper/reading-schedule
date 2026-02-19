import type { PlannerScheduleRow } from '../app/types.js';
import { sortRowsByDateAndSession } from './utils.js';

const DAYS_IN_WEEK = 7;

export type CalendarRow = PlannerScheduleRow;

export type CalendarRowWithFinish = CalendarRow & {
  finish: boolean;
};

type RowsByDate = Record<string, CalendarRowWithFinish[]>;

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rowIsPlannedForTodayOrLater(rowDate: string, today: string): boolean {
  if (!rowDate) {
    return false;
  }
  return rowDate >= today;
}

function nextProgress(
  bookId: string,
  plannedWords: number,
  progressByBookId: Record<string, number>,
): number {
  const previousProgress = Number(progressByBookId[bookId] || 0);
  const next = previousProgress + plannedWords;
  progressByBookId[bookId] = next;
  return next;
}

function isFinishRow(
  bookId: string,
  nextBookProgress: number,
  totals: Record<string, number>,
  finishedByBookId: Record<string, boolean>,
): boolean {
  if (!bookId) {
    return false;
  }
  const totalWords = Number(totals[bookId] || 0);
  if (totalWords <= 0) {
    return false;
  }
  if (finishedByBookId[bookId]) {
    return false;
  }
  if (nextBookProgress < totalWords) {
    return false;
  }
  finishedByBookId[bookId] = true;
  return true;
}

export function enrichRows(rows: CalendarRow[], totals: Record<string, number> = {}): CalendarRowWithFinish[] {
  const progressByBookId: Record<string, number> = {};
  const finishedByBookId: Record<string, boolean> = {};
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  return sortedRows.map((row) => {
    const rowDate = String(row.date || '');
    if (!rowIsPlannedForTodayOrLater(rowDate, today)) {
      return { ...row, finish: false };
    }

    const bookId = String(row.book_id || '');
    const plannedWords = Number(row.words_planned || 0);
    const nextBookProgress = nextProgress(bookId, plannedWords, progressByBookId);
    const finishesBook = isFinishRow(bookId, nextBookProgress, totals, finishedByBookId);
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
  const monthKeySet = new Set(rows.map((row) => row.date.slice(0, DAYS_IN_WEEK)));
  return [...monthKeySet].sort();
}

export function firstPlannedRow(rows: CalendarRow[] = []): CalendarRow | null {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  const upcoming = sortedRows.find((row) => String(row.date || '') >= today);
  return upcoming || sortedRows[0] || null;
}
