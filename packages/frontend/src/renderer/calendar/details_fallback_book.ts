import type { Book, CalendarRowWithFinish } from "../../types/types.ts";
import { BOOK_WEEKDAYS } from "../books/scheduled_days.ts";
import { BOOK_STATUS_IN_PROGRESS } from "../books/status_catalog.ts";

function fallbackBookDefaults(): Omit<Book, "book_id" | "title"> {
    return {
        author: "",
        blocked_by: null,
        cover_local_path: "",
        cover_url: "",
        deadline: null,
        difficulty: 3,
        finished_at: null,
        lookup_note: "",
        max_minutes_per_day: null,
        min_blocks_per_session: 1,
        pages_read: null,
        pages_total: null,
        priority: 3,
        progress_percent: 0,
        scheduled_days: [...BOOK_WEEKDAYS],
        shelf: "",
        status: BOOK_STATUS_IN_PROGRESS,
        words_total: null,
    };
}

/**
 * Creates minimal in-progress fallback book model from calendar row data.
 * @param row - Calendar row requiring fallback book context.
 * @returns Fallback book object for progress editing UI.
 */
export function fallbackBookForRow(row: CalendarRowWithFinish): Book {
    return {
        book_id: row.book_id,
        title: row.title,
        ...fallbackBookDefaults(),
    };
}
