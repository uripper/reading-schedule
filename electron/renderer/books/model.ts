// @ts-nocheck
import { uid } from "../dom.js";
import { clamp, toInt, toOptionalDate, toOptionalInt } from "./utils.js";

export function normalizeBook(book = {}) {
  const wordsTotal = toOptionalInt(book.words_total);
  const pagesTotal = toOptionalInt(book.pages_total);
  const progressRaw = clamp(Number(book.progress_percent || 0), 0, 100);
  let pagesRead = toOptionalInt(book.pages_read);
  if (pagesTotal && pagesRead === null) pagesRead = Math.round((progressRaw / 100) * pagesTotal);
  if (pagesTotal && pagesRead !== null) pagesRead = clamp(pagesRead, 0, pagesTotal);
  let progress = Math.round(progressRaw * 10) / 10;
  if (pagesTotal) {
    progress = Math.round((((pagesRead || 0) / pagesTotal) * 100) * 10) / 10;
  }

  return {
    book_id: String(book.book_id || "").trim() || uid(),
    title: String(book.title || "").trim(),
    author: String(book.author || "").trim(),
    words_total: wordsTotal,
    pages_total: pagesTotal,
    pages_read: pagesRead,
    progress_percent: progress,
    priority: clamp(toInt(book.priority || 3, 3), 1, 5),
    difficulty: clamp(toInt(book.difficulty || 3, 3), 1, 10),
    min_blocks_per_session: Math.max(1, toInt(book.min_blocks_per_session || 1, 1)),
    max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
    deadline: toOptionalDate(book.deadline),
    blocked_by: String(book.blocked_by || "").trim() || null,
    cover_url: String(book.cover_url || "").trim(),
    cover_local_path: String(book.cover_local_path || "").trim(),
    lookup_note: String(book.lookup_note || "").trim(),
  };
}

export function bookCoverSrc(book) {
  return book.cover_local_path || book.cover_url || "";
}

export function toPayloadBook(book) {
  return {
    book_id: book.book_id,
    title: book.title,
    words_total: book.words_total ?? null,
    pages_total: book.pages_total ?? null,
    pages_read: book.pages_read ?? null,
    progress_percent: book.progress_percent ?? 0,
    priority: book.priority || 3,
    difficulty: book.difficulty || 3,
    min_blocks_per_session: book.min_blocks_per_session || 1,
    max_minutes_per_day: book.max_minutes_per_day ?? null,
    deadline: book.deadline || null,
    blocked_by: book.blocked_by || null,
    author: book.author || "",
    cover_url: book.cover_url || "",
    cover_local_path: book.cover_local_path || "",
    lookup_note: book.lookup_note || "",
  };
}

export function hasSchedulableLength(book) {
  return (book.words_total || 0) > 0 || (book.pages_total || 0) > 0;
}
