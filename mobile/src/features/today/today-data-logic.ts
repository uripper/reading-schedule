import type {
    Book,
    PlannerApi,
    PlannerResult,
} from "@reading-schedule/contracts";
import type { TodayBookCard, TodayStats } from "./types.ts";

const CARD_ACCENTS = ["#9CD2EE", "#F16865", "#B5E080", "#E7B1EF", "#F4D738"];
const DEFAULT_BOOK_LIMIT = 6;
const DEFAULT_PAGE_TOTAL = 1;
const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;
const WORDS_PER_PAGE = 300;

export interface TodayViewData {
    books: TodayBookCard[];
    stats: TodayStats;
}

interface TodaySession {
    ended_at: string;
    minutes: number;
}

type LoadStateResult = Awaited<ReturnType<PlannerApi["loadState"]>>;

type ScheduleRow = PlannerResult["schedule"][number];

function localDayKey(date: Date): string {
    const YEAR = String(date.getFullYear());
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

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

function sessionKey(date: string, sessionIndex: number): string {
    return `${date}-${sessionIndex}`;
}

function clampPercent(rawValue: number): number {
    if (rawValue < 0) {
        return 0;
    }
    if (rawValue > 100) {
        return 100;
    }
    return Math.round(rawValue);
}

function roundedPositiveNumber(value: unknown): number | null {
    const NUMERIC_VALUE = Number(value ?? 0);
    if (Number.isNaN(NUMERIC_VALUE) || NUMERIC_VALUE <= 0) {
        return null;
    }
    return Math.round(NUMERIC_VALUE);
}

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

function toPagesDone(book: Book): number {
    const PAGES_READ = roundedPositiveNumber(book.pages_read);
    if (PAGES_READ) {
        return PAGES_READ;
    }

    const PERCENT = clampPercent(Number(book.progress_percent ?? 0));
    return Math.round((PERCENT / 100) * toPagesTotal(book));
}

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

function sourceBooks(books: Book[]): Book[] {
    const ACTIVE_BOOKS = books.filter((book) => book.status !== "read");
    if (ACTIVE_BOOKS.length > 0) {
        return ACTIVE_BOOKS;
    }
    return books;
}

function toBookCards(books: Book[]): TodayBookCard[] {
    return sourceBooks(books).slice(0, DEFAULT_BOOK_LIMIT).map(toBookCard);
}

function todayScheduleRows(
    plannerResult: PlannerResult | null | undefined,
): readonly ScheduleRow[] {
    const TODAY_KEY = localDayKey(new Date());
    const ROWS = plannerResult?.schedule ?? [];
    return ROWS.filter((row) => row.date === TODAY_KEY);
}

function completedRowCount(
    rows: readonly ScheduleRow[],
    completions: Record<string, boolean>,
): number {
    return rows.filter((row) => {
        return completions[sessionKey(row.date, row.session_index)];
    }).length;
}

function completedSessionsLabel(
    plannerResult: PlannerResult | null | undefined,
    completions: Record<string, boolean>,
): string {
    const TODAY_ROWS = todayScheduleRows(plannerResult);
    const COMPLETED_ROWS = completedRowCount(TODAY_ROWS, completions);
    return `${COMPLETED_ROWS}/${TODAY_ROWS.length}`;
}

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

function streakFromActiveDays(activeDays: ReadonlySet<string>): number {
    const CURSOR = new Date();
    let streak = 0;

    while (activeDays.has(localDayKey(CURSOR))) {
        streak += 1;
        CURSOR.setDate(CURSOR.getDate() - PREVIOUS_DAY_OFFSET);
    }

    return streak;
}

function dayStreak(sessions: TodaySession[]): number {
    return streakFromActiveDays(activeDayKeys(sessions));
}

async function safelyLoadState(
    plannerApi: PlannerApi,
): Promise<LoadStateResult | null> {
    try {
        return await plannerApi.loadState();
    } catch {
        return null;
    }
}

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

function loadedSessions(loadResult: LoadStateResult | null): TodaySession[] {
    const LOADED_SESSIONS = loadResult?.state?.sessions;
    if (Array.isArray(LOADED_SESSIONS)) {
        return LOADED_SESSIONS;
    }
    return [];
}

function loadedCompletions(
    loadResult: LoadStateResult | null,
): Record<string, boolean> {
    const RAW_COMPLETIONS = loadResult?.state?.schedule_completions;
    if (RAW_COMPLETIONS && typeof RAW_COMPLETIONS === "object") {
        return RAW_COMPLETIONS;
    }
    return {};
}

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
