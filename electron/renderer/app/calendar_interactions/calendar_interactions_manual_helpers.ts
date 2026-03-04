import type {
    PlannerScheduleRow,
    PlannerSettings,
} from "../../../types/types.js";

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
    const ROUNDED = Math.round(Number(minutes || 0));
    if (!Number.isFinite(ROUNDED) || ROUNDED < MIN_MANUAL_MINUTES) {
        return MIN_MANUAL_MINUTES;
    }
    return ROUNDED;
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

    for (const ROW of rows) {
        if (String(ROW.book_id || "") !== bookId) {
            continue;
        }
        const ROW_MINUTES = Number(ROW.minutes || 0);
        const ROW_WORDS = Number(ROW.words_planned || 0);
        if (ROW_MINUTES <= 0 || ROW_WORDS <= 0) {
            continue;
        }
        totalMinutes += ROW_MINUTES;
        totalWords += ROW_WORDS;
    }

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
    const MULTIPLIER_BY_DIFFICULTY = settings.difficulty_multiplier ?? {};
    const EXACT = MULTIPLIER_BY_DIFFICULTY[difficulty];
    const MULTIPLIER = Number(EXACT);
    if (!Number.isFinite(MULTIPLIER) || MULTIPLIER <= 0) {
        return DEFAULT_DIFFICULTY_MULTIPLIER;
    }
    return MULTIPLIER;
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
    const NORMALIZED_MINUTES = normalizeManualMinutes(minutes);
    const HISTORICAL_WPM = historicalWordsPerMinute(bookId, rows);
    if (HISTORICAL_WPM !== null) {
        return Math.max(
            MIN_MANUAL_WORDS,
            Math.round(NORMALIZED_MINUTES * HISTORICAL_WPM),
        );
    }
    const BASE = Number(settings.wpm_base ?? DEFAULT_MANUAL_WPM_BASE);
    let wpmBase = DEFAULT_MANUAL_WPM_BASE;
    if (Number.isFinite(BASE) && BASE > 0) {
        wpmBase = BASE;
    }
    const PLANNED =
        NORMALIZED_MINUTES *
        wpmBase *
        difficultyMultiplier(settings, difficulty);
    return Math.max(MIN_MANUAL_WORDS, Math.round(PLANNED));
}

/**
 * Normalizes a manually entered number of minutes for a session.
 * @param minutes Number of minutes for the session
 * @returns Normalized number of minutes
 */
export function normalizedManualMinutes(minutes: number): number {
    return normalizeManualMinutes(minutes);
}
