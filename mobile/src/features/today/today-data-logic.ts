/**
 * Builds the mobile Today screen view model from persisted planner state.
 */
import type {
    Book,
    PlannerApi,
    PlannerResult,
    TodayBookCard,
    TodayStats,
    TodayViewData,
} from "@reading-schedule/contracts";

const CARD_ACCENTS = ["#9CD2EE", "#F16865", "#B5E080", "#E7B1EF", "#F4D738"];
const DEFAULT_BOOK_LIMIT = 6;
const DEFAULT_PAGE_TOTAL = 1;
const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;
const WORDS_PER_PAGE = 300;

/**
 * Captures the session fields needed to compute daily streaks.
 */
interface TodaySession {
    ended_at: string;
    minutes: number;
}

/**
 * Describes the shape returned by the planner state loader.
 */
type LoadStateResult = Awaited<ReturnType<PlannerApi["loadState"]>>;

/**
 * Represents a single scheduled session row from the planner result.
 */
type ScheduleRow = PlannerResult["schedule"][number];

/**
 * Formats a local date as the day key used throughout the planner state.
 */
function localDayKey(date: Date): string {
    const YEAR = String(date.getFullYear());
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Normalizes timestamps and ISO date strings into planner day keys.
 */
function dayKeyFromTimestamp(value: string): string {
    const DIRECT = value.slice(0, 10);
    const LOOKS_ISO = /^\d{4}-\d{2}-\d{2}$/.test(DIRECT);
    if (LOOKS_ISO) {
        return DIRECT;
    }

    const DATE_VALUE = new Date(value);
    if (Number.isNaN(DATE_VALUE.getTime())) {
        return "";
    }
    return localDayKey(DATE_VALUE);
}

/**
 * Builds a stable completion key for a scheduled session.
 */
function sessionKey(date: string, sessionIndex: number): string {
    return `${date}-${sessionIndex}`;
}

/**
 * Clamps a numeric percentage into the display range used by the UI.
 */
function clampPercent(rawValue: number): number {
    if (rawValue < 0) {
        return 0;
    }
    if (rawValue > 100) {
        return 100;
    }
    return Math.round(rawValue);
}

/**
 * Converts unknown numeric input into a rounded positive number when possible.
 */
function roundedPositiveNumber(value: unknown): number | null {
    const NUMERIC_VALUE = Number(value ?? 0);
    if (Number.isNaN(NUMERIC_VALUE) || NUMERIC_VALUE <= 0) {
        return null;
    }
    return Math.round(NUMERIC_VALUE);
}

/**
 * Estimates a page total from a book's word count.
 */
function pagesFromWords(book: Book): number | null {
    const WORDS_TOTAL = roundedPositiveNumber(book.words_total);
    if (!WORDS_TOTAL) {
        return null;
    }
    return Math.max(
        DEFAULT_PAGE_TOTAL,
        Math.round(WORDS_TOTAL / WORDS_PER_PAGE),
    );
}

/**
 * Resolves the best available page-total value for a book card.
 */
function toPagesTotal(book: Book): number {
    const PAGES_TOTAL = roundedPositiveNumber(book.pages_total);
    if (PAGES_TOTAL) {
        return PAGES_TOTAL;
    }

    const PAGES_FROM_WORDS = pagesFromWords(book);
    if (PAGES_FROM_WORDS) {
        return PAGES_FROM_WORDS;
    }
    return DEFAULT_PAGE_TOTAL;
}

/**
 * Resolves the best available pages-completed value for a book card.
 */
function toPagesDone(book: Book): number {
    const PAGES_READ = roundedPositiveNumber(book.pages_read);
    if (PAGES_READ) {
        return PAGES_READ;
    }

    const PERCENT = clampPercent(Number(book.progress_percent ?? 0));
    return Math.round((PERCENT / 100) * toPagesTotal(book));
}

/**
 * Maps a planner book into the mobile Today card format.
 */
function toBookCard(book: Book, index: number): TodayBookCard {
    const ACCENT = CARD_ACCENTS[index % CARD_ACCENTS.length] ?? "#9CD2EE";
    return {
        accent: ACCENT,
        author: book.author,
        completionPercent: clampPercent(Number(book.progress_percent ?? 0)),
        id: book.book_id,
        pagesDone: toPagesDone(book),
        pagesTotal: toPagesTotal(book),
        title: book.title,
    };
}

/**
 * Prefers unread books for the carousel while falling back to the full shelf.
 */
function sourceBooks(books: Book[]): Book[] {
    const ACTIVE_BOOKS = books.filter((book) => book.status !== "read");
    if (ACTIVE_BOOKS.length > 0) {
        return ACTIVE_BOOKS;
    }
    return books;
}

/**
 * Builds the capped set of Today book cards shown on mobile.
 */
function toBookCards(books: Book[]): TodayBookCard[] {
    return sourceBooks(books).slice(0, DEFAULT_BOOK_LIMIT).map(toBookCard);
}

/**
 * Returns only the schedule rows assigned to the current local day.
 */
function todayScheduleRows(
    plannerResult: PlannerResult | null | undefined,
): readonly ScheduleRow[] {
    const TODAY_KEY = localDayKey(new Date());
    const ROWS = plannerResult?.schedule ?? [];
    return ROWS.filter((row) => row.date === TODAY_KEY);
}

/**
 * Counts completed schedule rows using the persisted completion map.
 */
function completedRowCount(
    rows: readonly ScheduleRow[],
    completions: Record<string, boolean>,
): number {
    return rows.filter((row) => {
        return completions[sessionKey(row.date, row.session_index)];
    }).length;
}

/**
 * Formats today's completed-session progress for the stats panel.
 */
function completedSessionsLabel(
    plannerResult: PlannerResult | null | undefined,
    completions: Record<string, boolean>,
): string {
    const TODAY_ROWS = todayScheduleRows(plannerResult);
    const COMPLETED_ROWS = completedRowCount(TODAY_ROWS, completions);
    return `${COMPLETED_ROWS}/${TODAY_ROWS.length}`;
}

/**
 * Collects the set of day keys that qualify toward the reading streak.
 */
function activeDayKeys(sessions: TodaySession[]): Set<string> {
    const ACTIVE_DAYS = new Set<string>();

    for (const SESSION of sessions) {
        if (SESSION.minutes < MIN_STREAK_MINUTES) {
            continue;
        }

        const KEY = dayKeyFromTimestamp(String(SESSION.ended_at));
        if (KEY) {
            ACTIVE_DAYS.add(KEY);
        }
    }

    return ACTIVE_DAYS;
}

/**
 * Walks backward from today to compute the current consecutive-day streak.
 */
function streakFromActiveDays(activeDays: ReadonlySet<string>): number {
    const CURSOR = new Date();
    let streak = 0;

    while (activeDays.has(localDayKey(CURSOR))) {
        streak += 1;
        CURSOR.setDate(CURSOR.getDate() - PREVIOUS_DAY_OFFSET);
    }

    return streak;
}

/**
 * Computes the current streak from the recorded reading sessions.
 */
function dayStreak(sessions: TodaySession[]): number {
    return streakFromActiveDays(activeDayKeys(sessions));
}

/**
 * Loads planner state and falls back to `null` when the persisted state is unavailable.
 */
async function safelyLoadState(
    plannerApi: PlannerApi,
): Promise<LoadStateResult | null> {
    try {
        return await plannerApi.loadState();
    } catch {
        return null;
    }
}

/**
 * Returns shelf books from saved state or falls back to the planner sample payload.
 */
async function booksForToday(
    loadResult: LoadStateResult | null,
    plannerApi: PlannerApi,
): Promise<Book[]> {
    const LOADED_BOOKS = loadResult?.state?.books;
    if (Array.isArray(LOADED_BOOKS) && LOADED_BOOKS.length > 0) {
        return LOADED_BOOKS;
    }

    const SAMPLE = await plannerApi.sample();
    return SAMPLE.books;
}

/**
 * Extracts the persisted session list used by the Today stats.
 */
function loadedSessions(loadResult: LoadStateResult | null): TodaySession[] {
    const LOADED_SESSIONS = loadResult?.state?.sessions;
    if (Array.isArray(LOADED_SESSIONS)) {
        return LOADED_SESSIONS;
    }
    return [];
}

/**
 * Extracts the persisted schedule completion map.
 */
function loadedCompletions(
    loadResult: LoadStateResult | null,
): Record<string, boolean> {
    const RAW_COMPLETIONS = loadResult?.state?.schedule_completions;
    if (RAW_COMPLETIONS && typeof RAW_COMPLETIONS === "object") {
        return RAW_COMPLETIONS;
    }
    return {};
}

/**
 * Builds the compact stats object rendered above the Today carousel.
 */
function buildTodayStats(
    loadResult: LoadStateResult | null,
    sessions: TodaySession[],
    completions: Record<string, boolean>,
): TodayStats {
    return {
        completedSessions: completedSessionsLabel(
            loadResult?.state?.last_result,
            completions,
        ),
        dayStreak: dayStreak(sessions),
    };
}

/**
 * Loads the mobile Today screen data from planner state and sample fallbacks.
 */
export async function loadTodayViewData(
    plannerApi: PlannerApi,
): Promise<TodayViewData> {
    const LOAD_RESULT = await safelyLoadState(plannerApi);
    const BOOKS = await booksForToday(LOAD_RESULT, plannerApi);
    const SESSIONS = loadedSessions(LOAD_RESULT);
    const COMPLETIONS = loadedCompletions(LOAD_RESULT);

    return {
        books: toBookCards(BOOKS),
        stats: buildTodayStats(LOAD_RESULT, SESSIONS, COMPLETIONS),
    };
}
