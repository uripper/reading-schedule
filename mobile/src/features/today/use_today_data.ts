import type {
    Book,
    PlannerApi,
    PlannerResult,
} from "@reading-schedule/contracts";
import { useEffect, useState } from "react";
import type { TodayBookCard, TodayStats } from "./types";

const CARD_ACCENTS = ["#9CD2EE", "#F16865", "#B5E080", "#E7B1EF", "#F4D738"];
const DEFAULT_BOOK_LIMIT = 6;
const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;

interface TodayViewData {
    books: TodayBookCard[];
    stats: TodayStats;
}

interface TodayState {
    errorMessage: string | null;
    isLoading: boolean;
    viewData: TodayViewData;
}

const LOCAL_FALLBACK_VIEW_DATA: TodayViewData = {
    books: [
        {
            accent: "#9CD2EE",
            author: "William Shakespeare",
            completionPercent: 32,
            id: "fallback-hamlet",
            pagesDone: 55,
            pagesTotal: 170,
            title: "Hamlet",
        },
        {
            accent: "#F16865",
            author: "Miguel de Cervantes",
            completionPercent: 12,
            id: "fallback-don-quixote",
            pagesDone: 137,
            pagesTotal: 1100,
            title: "Don Quixote",
        },
        {
            accent: "#B5E080",
            author: "Jorge Luis Borges",
            completionPercent: 32,
            id: "fallback-ficciones",
            pagesDone: 55,
            pagesTotal: 170,
            title: "Ficciones",
        },
    ],
    stats: {
        completedSessions: "1/3",
        dayStreak: 7,
    },
};

interface TodaySession {
    ended_at: string;
    minutes: number;
}

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

function toPagesDone(book: Book): number {
    const PAGES_READ = Number(book.pages_read ?? 0);
    if (!Number.isNaN(PAGES_READ) && PAGES_READ > 0) {
        return Math.round(PAGES_READ);
    }
    const PERCENT = clampPercent(Number(book.progress_percent ?? 0));
    const PAGES_TOTAL = toPagesTotal(book);
    return Math.round((PERCENT / 100) * PAGES_TOTAL);
}

function toPagesTotal(book: Book): number {
    const PAGES_TOTAL = Number(book.pages_total ?? 0);
    if (!Number.isNaN(PAGES_TOTAL) && PAGES_TOTAL > 0) {
        return Math.round(PAGES_TOTAL);
    }
    const WORDS_TOTAL = Number(book.words_total ?? 0);
    if (!Number.isNaN(WORDS_TOTAL) && WORDS_TOTAL > 0) {
        const WORDS_PER_PAGE = 300;
        return Math.max(1, Math.round(WORDS_TOTAL / WORDS_PER_PAGE));
    }
    return 1;
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

function toBookCards(books: Book[]): TodayBookCard[] {
    const ACTIVE_BOOKS = books.filter((book) => book.status !== "read");
    let sourceBooks = books;
    if (ACTIVE_BOOKS.length > 0) {
        sourceBooks = ACTIVE_BOOKS;
    }
    return sourceBooks.slice(0, DEFAULT_BOOK_LIMIT).map(toBookCard);
}

function completedSessionsLabel(
    plannerResult: PlannerResult | null | undefined,
    completions: Record<string, boolean>,
): string {
    const TODAY_KEY = localDayKey(new Date());
    const ROWS = plannerResult?.schedule ?? [];
    let completed = 0;
    let total = 0;

    ROWS.forEach((row) => {
        if (row.date !== TODAY_KEY) {
            return;
        }
        total += 1;
        const KEY = sessionKey(row.date, row.session_index);
        if (completions[KEY]) {
            completed += 1;
        }
    });

    return `${completed}/${total}`;
}

function dayStreak(sessions: TodaySession[]): number {
    const ACTIVE_DAYS = new Set<string>();
    sessions.forEach((session) => {
        if (session.minutes < MIN_STREAK_MINUTES) {
            return;
        }
        const KEY = dayKeyFromTimestamp(String(session.ended_at));
        if (!KEY) {
            return;
        }
        ACTIVE_DAYS.add(KEY);
    });

    const CURSOR = new Date();
    let streak = 0;
    for (;;) {
        const KEY = localDayKey(CURSOR);
        if (!ACTIVE_DAYS.has(KEY)) {
            break;
        }
        streak += 1;
        CURSOR.setDate(CURSOR.getDate() - PREVIOUS_DAY_OFFSET);
    }
    return streak;
}

async function loadTodayViewData(
    plannerApi: PlannerApi,
): Promise<TodayViewData> {
    let loadResult: Awaited<ReturnType<PlannerApi["loadState"]>> | null = null;
    try {
        loadResult = await plannerApi.loadState();
    } catch {
        loadResult = null;
    }

    const LOADED_BOOKS = loadResult?.state?.books;

    let books: Book[] = [];
    if (Array.isArray(LOADED_BOOKS)) {
        books = LOADED_BOOKS;
    }
    if (books.length === 0) {
        const SAMPLE = await plannerApi.sample();
        books = SAMPLE.books;
    }

    const VIEW_BOOKS = toBookCards(books);
    const LOADED_RESULT = loadResult?.state?.last_result;

    let sessions: TodaySession[] = [];
    if (Array.isArray(loadResult?.state?.sessions)) {
        sessions = loadResult.state.sessions;
    }

    let completions: Record<string, boolean> = {};
    const RAW_COMPLETIONS = loadResult?.state?.schedule_completions;
    if (RAW_COMPLETIONS && typeof RAW_COMPLETIONS === "object") {
        completions = RAW_COMPLETIONS;
    }

    return {
        books: VIEW_BOOKS,
        stats: {
            completedSessions: completedSessionsLabel(
                LOADED_RESULT,
                completions,
            ),
            dayStreak: dayStreak(sessions),
        },
    };
}

const INITIAL_STATE: TodayState = {
    errorMessage: null,
    isLoading: false,
    viewData: LOCAL_FALLBACK_VIEW_DATA,
};

export function useTodayData(plannerApi: PlannerApi) {
    const [STATE, SET_STATE] = useState<TodayState>(INITIAL_STATE);

    async function refresh(): Promise<void> {
        SET_STATE((previous) => {
            return {
                ...previous,
                errorMessage: null,
            };
        });
        try {
            const VIEW_DATA = await loadTodayViewData(plannerApi);
            SET_STATE({
                errorMessage: null,
                isLoading: false,
                viewData: VIEW_DATA,
            });
        } catch {
            SET_STATE({
                errorMessage: null,
                isLoading: false,
                viewData: LOCAL_FALLBACK_VIEW_DATA,
            });
        }
    }

    useEffect(() => {
        refresh().catch(() => {
            SET_STATE({
                errorMessage: null,
                isLoading: false,
                viewData: LOCAL_FALLBACK_VIEW_DATA,
            });
        });
    }, [plannerApi]);

    return {
        books: STATE.viewData.books,
        errorMessage: STATE.errorMessage,
        isLoading: STATE.isLoading,
        refresh,
        stats: STATE.viewData.stats,
    };
}
