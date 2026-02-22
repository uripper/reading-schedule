import type { PlannerScheduleRow, PlannerSettings } from "./types.js";

const DEFAULT_MANUAL_WPM_BASE = 220;
const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
const MIN_MANUAL_MINUTES = 1;
const MIN_MANUAL_WORDS = 1;
export const DEFAULT_BOOK_DIFFICULTY = 3;

/**
 *
 * @param minutes
 */
function normalizeManualMinutes(minutes: number): number {
  const rounded = Math.round(Number(minutes || 0));
  if (!Number.isFinite(rounded) || rounded < MIN_MANUAL_MINUTES) {
    return MIN_MANUAL_MINUTES;
  }
  return rounded;
}

/**
 *
 * @param bookId
 * @param rows
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
 *
 * @param settings
 * @param difficulty
 */
function difficultyMultiplier(
  settings: PlannerSettings,
  difficulty: number,
): number {
  const multiplierByDifficulty = settings.difficulty_multiplier;
  const exact = multiplierByDifficulty[difficulty];
  const byKey = multiplierByDifficulty[String(difficulty)];
  const multiplier = Number(exact ?? byKey ?? DEFAULT_DIFFICULTY_MULTIPLIER);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return DEFAULT_DIFFICULTY_MULTIPLIER;
  }
  return multiplier;
}

/**
 *
 * @param root0
 * @param root0.bookId
 * @param root0.minutes
 * @param root0.rows
 * @param root0.settings
 * @param root0.difficulty
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
  const base = Number(settings.wpm_base || DEFAULT_MANUAL_WPM_BASE);
  let wpmBase = DEFAULT_MANUAL_WPM_BASE;
  if (Number.isFinite(base) && base > 0) {
    wpmBase = base;
  }
  const planned =
    normalizedMinutes * wpmBase * difficultyMultiplier(settings, difficulty);
  return Math.max(MIN_MANUAL_WORDS, Math.round(planned));
}

/**
 *
 * @param minutes
 */
export function normalizedManualMinutes(minutes: number): number {
  return normalizeManualMinutes(minutes);
}
