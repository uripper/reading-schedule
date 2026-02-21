import type { Book } from "../books/types.js";
import type { CalendarRowWithFinish } from "../calendar/data.js";
import { sessionKeyFor } from "../calendar/utils.js";
import type {
  PlannerResult,
  PlannerScheduleRow,
  PlannerSettings,
} from "./types.js";

type ScheduleRow = {
  title?: string;
  date?: string;
  book_id?: string;
};

export type CompletionUpdate = {
  sessionKey: string;
  completed: boolean;
  row?: ScheduleRow;
};

export type ProgressUpdateInput = {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row?: CalendarRowWithFinish;
};

export type ManualSessionAddInput = {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
};

export type RemoveSessionInput = {
  row: CalendarRowWithFinish;
};

export type ManualSessionBook = {
  bookId: string;
  title: string;
};

export type UpdatedBook = Book;

export function dayBookCompletionKey(rowDate: string, bookId: string): string {
  return `${rowDate}|${bookId}`;
}

export function dayBookCompletionKeyFromSession(sessionKey: string): string {
  const [date, , bookId] = String(sessionKey || "").split("|");
  if (!date || !bookId) {
    return "";
  }
  return dayBookCompletionKey(date, bookId);
}

const DEFAULT_MANUAL_WPM_BASE = 220;
const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
const MIN_MANUAL_MINUTES = 1;
const MIN_MANUAL_WORDS = 1;

function normalizeManualMinutes(minutes: number): number {
  const rounded = Math.round(Number(minutes || 0));
  if (!Number.isFinite(rounded) || rounded < MIN_MANUAL_MINUTES) {
    return MIN_MANUAL_MINUTES;
  }
  return rounded;
}

function historicalWordsPerMinute(
  bookId: string,
  rows: PlannerScheduleRow[] = [],
): number | null {
  let totalWords = 0;
  let totalMinutes = 0;
  rows.forEach((row) => {
    if (String(row.book_id || "") !== bookId) {
      return;
    }
    const rowMinutes = Number(row.minutes || 0);
    const rowWords = Number(row.words_planned || 0);
    if (rowMinutes <= 0 || rowWords <= 0) {
      return;
    }
    totalMinutes += rowMinutes;
    totalWords += rowWords;
  });
  if (totalMinutes <= 0 || totalWords <= 0) {
    return null;
  }
  return totalWords / totalMinutes;
}

function difficultyMultiplier(
  settings: PlannerSettings,
  difficulty: number,
): number {
  const multiplierByDifficulty = settings.difficulty_multiplier || {};
  const exact = multiplierByDifficulty[difficulty];
  const byKey = multiplierByDifficulty[String(difficulty)];
  const multiplier = Number(exact ?? byKey ?? DEFAULT_DIFFICULTY_MULTIPLIER);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return DEFAULT_DIFFICULTY_MULTIPLIER;
  }
  return multiplier;
}

export function wordsPlannedForManualSession({
  bookId,
  minutes,
  rows = [],
  settings = {},
  difficulty = 3,
}: {
  bookId: string;
  minutes: number;
  rows?: PlannerScheduleRow[];
  settings?: PlannerSettings;
  difficulty?: number;
}): number {
  const normalizedMinutes = normalizeManualMinutes(minutes);
  const historicalWpm = historicalWordsPerMinute(bookId, rows);
  if (historicalWpm !== null) {
    return Math.max(
      MIN_MANUAL_WORDS,
      Math.round(normalizedMinutes * historicalWpm),
    );
  }

  const base = Number(settings.wpm_base || DEFAULT_MANUAL_WPM_BASE);
  let wpmBase = DEFAULT_MANUAL_WPM_BASE;
  if (Number.isFinite(base) && base > 0) {
    wpmBase = base;
  }
  const planned =
    normalizedMinutes * wpmBase * difficultyMultiplier(settings, difficulty);
  return Math.max(MIN_MANUAL_WORDS, Math.round(planned));
}

export function nextSessionIndexForDate(
  date: string,
  rows: PlannerScheduleRow[] = [],
): number {
  let maxIndex = 0;
  rows.forEach((row) => {
    if (String(row.date || "") !== date) {
      return;
    }
    const index = Number(row.session_index || 0);
    if (Number.isFinite(index)) {
      maxIndex = Math.max(maxIndex, Math.floor(index));
    }
  });
  return maxIndex + 1;
}

export function rowsWithoutSession(
  targetSessionKey: string,
  rows: PlannerScheduleRow[] = [],
): PlannerScheduleRow[] {
  const key = String(targetSessionKey || "");
  if (!key) {
    return [...rows];
  }
  return rows.filter((row) => {
    return sessionKeyFor(row) !== key;
  });
}

export function emptyPlannerResult(): PlannerResult {
  return {
    schedule: [],
    summary: null,
    created_at: "",
  };
}

export function manualSessionBooks(books: Book[] = []): ManualSessionBook[] {
  return books
    .map((book) => ({
      bookId: String(book.book_id || ""),
      title: String(book.title || "").trim(),
    }))
    .filter((book) => book.bookId && book.title)
    .sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
    );
}

export function normalizedManualMinutes(minutes: number): number {
  return normalizeManualMinutes(minutes);
}
