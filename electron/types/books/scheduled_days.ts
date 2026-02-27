import type { BOOK_WEEKDAYS } from "../../renderer/books/scheduled_days.js";

export type BookWeekday = (typeof BOOK_WEEKDAYS)[number];
