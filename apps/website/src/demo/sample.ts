/** Builds a fresh demonstration library using the visitor's local dates. */

import type { PlannerStateSnapshot } from "@reading-schedule/contracts";
import { parseSamplePayload } from "@reading-schedule/contracts";
import SAMPLE_BOOKS from "./generated/books.sample.json" with { type: "json" };
import SAMPLE_SETTINGS from "./generated/settings.json" with { type: "json" };

const DEMO_BOOK_COUNT = 5;
const PLAN_HORIZON_YEARS = 10;
const DAILY_MINUTES = 30;
const READING_WORDS_PER_MINUTE = 250;
const DEFAULT_DIFFICULTY = 3;
const MONTH_OFFSET = 1;
const DATE_PADDING = 2;

/** Formats a calendar date locally so UTC offsets cannot shift the demo day. */
function dayKey(date: Date): string {
    const MONTH = String(date.getMonth() + MONTH_OFFSET).padStart(
        DATE_PADDING,
        "0",
    );
    const DAY = String(date.getDate()).padStart(DATE_PADDING, "0");
    return `${date.getFullYear()}-${MONTH}-${DAY}`;
}

/** Accepts the sample fixture's legacy page-count spelling at the boundary. */
function samplePages(book: object): number | null {
    if ("pages_total" in book && typeof book.pages_total === "number") {
        return book.pages_total;
    }
    if ("total_pages" in book && typeof book.total_pages === "number") {
        return book.total_pages;
    }
    return null;
}

/** Returns sample books with no stale deadlines or historical schedule dates. */
export function createDemoSample(
    now = new Date(),
): Pick<PlannerStateSnapshot, "books" | "settings"> {
    const END = new Date(now);
    END.setFullYear(END.getFullYear() + PLAN_HORIZON_YEARS);
    const BOOKS = SAMPLE_BOOKS.slice(0, DEMO_BOOK_COUNT).map((book) => {
        return {
            ...book,
            deadline: null,
            difficulty: DEFAULT_DIFFICULTY,
            pages_total: samplePages(book),
        };
    });
    return parseSamplePayload({
        books: BOOKS,
        settings: {
            ...SAMPLE_SETTINGS,
            days_off: [],
            end_date: dayKey(END),
            minutes_by_weekday: {},
            minutes_per_day: DAILY_MINUTES,
            planner_solver_profile: "fast",
            start_date: dayKey(now),
            wpm_base: READING_WORDS_PER_MINUTE,
        },
    });
}
