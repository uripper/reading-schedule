import type {
    PlannerScheduleRow,
    PlannerSettings,
} from "../../../types/types.ts";

const DEFAULT_MANUAL_WPM_BASE = 220;
const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
const MIN_MANUAL_MINUTES = 1;
const MIN_MANUAL_WORDS = 1;
export const DEFAULT_BOOK_DIFFICULTY = 3;

type HistoricalReadingTotals = {
    totalWords: number;
    totalMinutes: number;
};

/**
 * Normalizes a manually entered number of minutes for a session,
 * ensuring it's a finite number and applying a minimum if necessary.
 * @param minutes - number of minutes for a manually entered session
 * @returns normalized number of minutes to use for calculations and display
 */
function normalizeManualMinutes(minutes: number): number {
    const ROUNDED = Math.round(Number(minutes || 0));
    if (!Number.isFinite(ROUNDED) || ROUNDED < MIN_MANUAL_MINUTES) {
        return MIN_MANUAL_MINUTES;
    }
    return ROUNDED;
}

/**
 * Calculates the historical words per minute for a given book based on past rows.
 * @param bookId - ID of the book to calculate WPM for
 * @param rows -Array of past planner schedule rows
 * @returns Historical words per minute or null if not enough data
 */
function historicalWordsPerMinute(
    bookId: string,
    rows: PlannerScheduleRow[] = [],
): number | null {
    const TOTALS = historicalReadingTotals(bookId, rows);
    if (!hasHistoricalReadingTotals(TOTALS)) {
        return null;
    }
    return TOTALS.totalWords / TOTALS.totalMinutes;
}

function historicalReadingTotals(
    bookId: string,
    rows: PlannerScheduleRow[],
): HistoricalReadingTotals {
    let totals: HistoricalReadingTotals = {
        totalMinutes: 0,
        totalWords: 0,
    };
    for (const ROW of rows) {
        totals = mergedHistoricalRowTotals(
            totals,
            rowReadingTotals(bookId, ROW),
        );
    }
    return totals;
}

function mergedHistoricalRowTotals(
    totals: HistoricalReadingTotals,
    rowTotals: { minutes: number; words: number } | null,
): HistoricalReadingTotals {
    if (rowTotals === null) {
        return totals;
    }
    return {
        totalMinutes: totals.totalMinutes + rowTotals.minutes,
        totalWords: totals.totalWords + rowTotals.words,
    };
}

function hasHistoricalReadingTotals(totals: HistoricalReadingTotals): boolean {
    return totals.totalMinutes > 0 && totals.totalWords > 0;
}

function rowReadingTotals(
    bookId: string,
    row: PlannerScheduleRow,
): { minutes: number; words: number } | null {
    if (!matchesBookId(bookId, row)) {
        return null;
    }
    return positiveRowReadingTotals(row);
}

function matchesBookId(bookId: string, row: PlannerScheduleRow): boolean {
    return String(row.book_id || "") === bookId;
}

function positiveRowReadingTotals(
    row: PlannerScheduleRow,
): { minutes: number; words: number } | null {
    const MINUTES = Number(row.minutes || 0);
    const WORDS = Number(row.words_planned || 0);
    if (MINUTES <= 0 || WORDS <= 0) {
        return null;
    }
    return { minutes: MINUTES, words: WORDS };
}

/**
 * Calculates the difficulty multiplier for a given book based on settings and difficulty level.
 * @param settings - Planner settings containing difficulty multipliers
 * @param difficulty - Difficulty level of the book
 * @returns Calculated difficulty multiplier
 */
function difficultyMultiplier(
    settings: PlannerSettings,
    difficulty: number,
): number {
    const MULTIPLIER_BY_DIFFICULTY = settings.difficulty_multiplier ?? {};
    const EXACT = MULTIPLIER_BY_DIFFICULTY[difficulty];
    const MULTIPLIER = Number(EXACT);
    if (!Number.isFinite(MULTIPLIER) || MULTIPLIER <= 0) {
        return DEFAULT_DIFFICULTY_MULTIPLIER;
    }
    return MULTIPLIER;
}

function baseWordsPerMinute(settings: PlannerSettings): number {
    const BASE = Number(settings.wpm_base ?? DEFAULT_MANUAL_WPM_BASE);
    if (!Number.isFinite(BASE) || BASE <= 0) {
        return DEFAULT_MANUAL_WPM_BASE;
    }
    return BASE;
}

function plannedWordsFromHistory(
    minutes: number,
    historicalWpm: number | null,
): number | null {
    if (historicalWpm === null) {
        return null;
    }
    return Math.max(MIN_MANUAL_WORDS, Math.round(minutes * historicalWpm));
}

/**
 * Calculates the number of words planned for a manually entered session.
 * @param root0 - Object containing parameters for the calculation
 * @param bookId - ID of the book for the session
 * @param minutes - Number of minutes for the session
 * @param rows - Array of past planner schedule rows
 * @param settings - Planner settings containing difficulty multipliers
 * @param difficulty - Difficulty level of the book
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
    const NORMALIZED_MINUTES = normalizeManualMinutes(minutes);
    const HISTORICAL_WPM = historicalWordsPerMinute(bookId, rows);
    const HISTORICAL_PLANNED = plannedWordsFromHistory(
        NORMALIZED_MINUTES,
        HISTORICAL_WPM,
    );
    if (HISTORICAL_PLANNED !== null) {
        return HISTORICAL_PLANNED;
    }
    const PLANNED =
        NORMALIZED_MINUTES *
        baseWordsPerMinute(settings) *
        difficultyMultiplier(settings, difficulty);
    return Math.max(MIN_MANUAL_WORDS, Math.round(PLANNED));
}

/**
 * Normalizes a manually entered number of minutes for a session.
 * @param minutes - Number of minutes for the session
 * @returns Normalized number of minutes
 */
export function normalizedManualMinutes(minutes: number): number {
    return normalizeManualMinutes(minutes);
}
