import type { Book, CalendarRowWithFinish } from "../../types/types.js";
import { BOOK_WEEKDAYS } from "../books/scheduled_days.js";
import { BOOK_STATUS_IN_PROGRESS } from "../books/status_catalog.js";

/**
 * Creates minimal in-progress fallback book model from calendar row data.
 * @param row Calendar row requiring fallback book context.
 * @returns Fallback book object for progress editing UI.
 */
export function fallbackBookForRow(row: CalendarRowWithFinish): Book {
    return {
        book_id: row.book_id,
        title: row.title,
        author: "",
        words_total: null,
        pages_total: null,
        pages_read: null,
        progress_percent: 0,
        priority: 3,
        difficulty: 3,
        min_blocks_per_session: 1,
        max_minutes_per_day: null,
        deadline: null,
        blocked_by: null,
        shelf: "",
        scheduled_days: [...BOOK_WEEKDAYS],
        status: BOOK_STATUS_IN_PROGRESS,
        finished_at: null,
        cover_url: "",
        cover_local_path: "",
        lookup_note: "",
    };
}
