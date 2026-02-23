import type { PlannerScheduleRow, PlannerSettings } from "../types.js";

const DEFAULT_MANUAL_WPM_BASE = 220;
const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
const MIN_MANUAL_MINUTES = 1;
const MIN_MANUAL_WORDS = 1;
export const DEFAULT_BOOK_DIFFICULTY = 3;

/**
 * Normalizes a manually entered number of minutes for a session,
 * ensuring it's a finite number and applying a minimum if necessary.
 * @param minutes number of minutes for a manually entered session
 * @returns normalized number of minutes to use for calculations and display
 */
function normalizeManualMinutes(minutes: number): number {
  const rounded = Math.round(Number(minutes || 0));
  if (!Number.isFinite(rounded) || rounded < MIN_MANUAL_MINUTES) {
    return MIN_MANUAL_MINUTES;
  }
  return rounded;
}

/**
 * Calculates the historical words per minute for a given book based on past rows.
 * @param bookId ID of the book to calculate WPM for
 * @param rows Array of past planner schedule rows
 * @returns Historical words per minute or null if not enough data
 */
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

/**
 * Calculates the difficulty multiplier for a given book based on settings and difficulty level.
 * @param settings Planner settings containing difficulty multipliers
 * @param difficulty Difficulty level of the book
 * @returns Calculated difficulty multiplier
 */
function difficultyMultiplier(
  settings: PlannerSettings,
  difficulty: number,
): number {
  const multiplierByDifficulty = settings.difficulty_multiplier ?? {};
  const exact = multiplierByDifficulty[difficulty];
  const multiplier = Number(exact);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return DEFAULT_DIFFICULTY_MULTIPLIER;
  }
  return multiplier;
}

/**
 * Calculates the number of words planned for a manually entered session.
 * @param root0 Object containing parameters for the calculation
 * @param root0.bookId ID of the book for the session
 * @param root0.minutes Number of minutes for the session
 * @param root0.rows Array of past planner schedule rows
 * @param root0.settings Planner settings containing difficulty multipliers
 * @param root0.difficulty Difficulty level of the book
 * @returns Number of words planned for the session
 */
export function wordsPlannedForManualSession({
  bookId,
  minutes,
  rows = [],
  settings = {},
  difficulty = DEFAULT_BOOK_DIFFICULTY,
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
  const base = Number(settings.wpm_base ?? DEFAULT_MANUAL_WPM_BASE);
  let wpmBase = DEFAULT_MANUAL_WPM_BASE;
  if (Number.isFinite(base) && base > 0) {
    wpmBase = base;
  }
  const planned =
    normalizedMinutes * wpmBase * difficultyMultiplier(settings, difficulty);
  return Math.max(MIN_MANUAL_WORDS, Math.round(planned));
}

/**
 * Normalizes a manually entered number of minutes for a session.
 * @param minutes Number of minutes for the session
 * @returns Normalized number of minutes
 */
export function normalizedManualMinutes(minutes: number): number {
  return normalizeManualMinutes(minutes);
}
