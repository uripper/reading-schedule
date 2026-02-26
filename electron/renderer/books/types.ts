import type { BookStatus } from "./status.js";

export interface Book {
  book_id: string;
  title: string;
  author: string;
  words_total: number | null;
  pages_total: number | null;
  pages_read: number | null;
  progress_percent: number;
  priority: number;
  difficulty: number;
  min_blocks_per_session: number;
  max_minutes_per_day: number | null;
  deadline: string | null;
  blocked_by: string | null;
  shelf: string;
  scheduled_days: string[];
  status: BookStatus;
  finished_at: string | null;
  cover_url: string;
  cover_local_path: string;
  lookup_note: string;
}

export type BookInput = Partial<Book>;

export interface BookProgressUpdates {
  pagesRead?: number | null;
  progressPercent?: number | null;
}

export interface BookMetaOptions {
  titleById?: Record<string, string>;
  finishDateByBookId?: Record<string, string>;
  showShelfMeta?: boolean;
  showBlockerMeta?: boolean;
  showWordCount?: boolean;
}
