// @ts-nocheck

import { uid } from "../dom.js";
import { clamp, toInt, toOptionalDate, toOptionalInt } from "./utils.js";
import { normalizeShelfName } from "./shelf.js";

const DEFAULT_PRIORITY = 3;
const DEFAULT_DIFFICULTY = 3;
const MIN_PRIORITY = 1;
const MAX_PRIORITY = 5;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const DEFAULT_MIN_BLOCKS = 1;

function normalizeProgressAndPages(pagesTotal, pagesRead, progressRaw) {
  let nextPagesRead = pagesRead;
  if (pagesTotal && nextPagesRead === null) {
    nextPagesRead = Math.round((progressRaw / 100) * pagesTotal);
  }
  if (pagesTotal && nextPagesRead !== null) {
    nextPagesRead = clamp(nextPagesRead, 0, pagesTotal);
  }

  let progress = Math.round(progressRaw * 10) / 10;
  if (pagesTotal) {
    progress = Math.round((((nextPagesRead || 0) / pagesTotal) * 100) * 10) / 10;
  }
  return { pagesRead: nextPagesRead, progress };
}

export function normalizeBook(book = {}) {
  const wordsTotal = toOptionalInt(book.words_total);
  const pagesTotal = toOptionalInt(book.pages_total);
  const progressRaw = clamp(Number(book.progress_percent || 0), 0, 100);
  const pagesReadRaw = toOptionalInt(book.pages_read);
  const { pagesRead, progress } = normalizeProgressAndPages(pagesTotal, pagesReadRaw, progressRaw);

  return {
    book_id: String(book.book_id || "").trim() || uid(),
    title: String(book.title || "").trim(),
    author: String(book.author || "").trim(),
    words_total: wordsTotal,
    pages_total: pagesTotal,
    pages_read: pagesRead,
    progress_percent: progress,
    priority: clamp(toInt(book.priority || DEFAULT_PRIORITY, DEFAULT_PRIORITY), MIN_PRIORITY, MAX_PRIORITY),
    difficulty: clamp(toInt(book.difficulty || DEFAULT_DIFFICULTY, DEFAULT_DIFFICULTY), MIN_DIFFICULTY, MAX_DIFFICULTY),
    min_blocks_per_session: Math.max(DEFAULT_MIN_BLOCKS, toInt(book.min_blocks_per_session || DEFAULT_MIN_BLOCKS, DEFAULT_MIN_BLOCKS)),
    max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
    deadline: toOptionalDate(book.deadline),
    blocked_by: String(book.blocked_by || "").trim() || null,
    shelf: normalizeShelfName(book.shelf),
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
    priority: book.priority || DEFAULT_PRIORITY,
    difficulty: book.difficulty || DEFAULT_DIFFICULTY,
    min_blocks_per_session: book.min_blocks_per_session || DEFAULT_MIN_BLOCKS,
    max_minutes_per_day: book.max_minutes_per_day ?? null,
    deadline: book.deadline || null,
    blocked_by: book.blocked_by || null,
    shelf: book.shelf || "",
    author: book.author || "",
    cover_url: book.cover_url || "",
    cover_local_path: book.cover_local_path || "",
    lookup_note: book.lookup_note || "",
  };
}

export function hasSchedulableLength(book) {
  return (book.words_total || 0) > 0 || (book.pages_total || 0) > 0;
}
