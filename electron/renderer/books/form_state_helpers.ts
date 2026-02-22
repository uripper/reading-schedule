import { dayKey } from "../calendar/utils.js";
import { COVER_PLACEHOLDER } from "./constants.js";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  type BookStatus,
} from "./status.js";
import { clamp, toOptionalInt } from "./utils.js";
import type { BookFormRefs } from "./form_refs.js";

export const DEFAULT_PROGRESS = "0";
export const DEFAULT_PRIORITY = "3";
export const DEFAULT_DIFFICULTY = "3";
export const DEFAULT_MIN_BLOCKS = "1";

export const CUSTOM_COVER_NOTE = "Custom cover uploaded.";

const PROGRESS_MAX = 100;
const PROGRESS_DECIMAL_SCALE = 10;

/**
 *
 */
function todayDateKey(): string {
  return dayKey(new Date());
}

/**
 *
 * @param refs
 * @param src
 */
export function setCoverPreview(refs: BookFormRefs, src: string): void {
  refs.coverPreview.src = src || COVER_PLACEHOLDER;
  refs.coverPreview.classList.toggle("is-empty", !src);
}

/**
 *
 * @param inputNode
 * @param value
 */
export function setOptionalIntegerInputValue(
  inputNode: HTMLInputElement,
  value: number | null | undefined,
): void {
  inputNode.value = "";
  if (value === null || value === undefined) {
    return;
  }
  inputNode.value = String(value);
}

/**
 *
 * @param value
 * @param fallback
 */
export function fallbackText(
  value: string | null | undefined,
  fallback = "",
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return value;
}

/**
 *
 * @param value
 * @param fallback
 */
export function fallbackNumberText(
  value: number | null | undefined,
  fallback: string,
): string {
  if (value === null || value === undefined || value === 0) {
    return fallback;
  }
  return String(value);
}

/**
 *
 * @param refs
 */
export function requiredTitle(refs: BookFormRefs): string {
  const title = refs.titleInput.value.trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  return title;
}

/**
 *
 * @param refs
 */
export function validatedStatusSelection(refs: BookFormRefs): BookStatus {
  const raw = String(refs.statusSelectInput.value || "").trim();
  if (raw === BOOK_STATUS_READ) {
    return BOOK_STATUS_READ;
  }
  if (raw === BOOK_STATUS_IN_PROGRESS) {
    return BOOK_STATUS_IN_PROGRESS;
  }
  if (raw === BOOK_STATUS_DROPPED) {
    return BOOK_STATUS_DROPPED;
  }
  return BOOK_STATUS_TO_READ;
}

/**
 *
 * @param refs
 * @param status
 */
function toggleFinishedAtInput(refs: BookFormRefs, status: BookStatus): void {
  const isRead = status === BOOK_STATUS_READ;
  refs.finishedAtField.hidden = !isRead;
  refs.finishedAtInput.disabled = !isRead;
  if (!isRead) {
    return;
  }
  if (refs.finishedAtInput.value) {
    return;
  }
  refs.finishedAtInput.value = todayDateKey();
}

/**
 *
 * @param refs
 */
export function syncFinishedAtFieldState(refs: BookFormRefs): void {
  const status = validatedStatusSelection(refs);
  toggleFinishedAtInput(refs, status);
}

/**
 *
 * @param refs
 */
export function deriveLengthAndProgress(refs: BookFormRefs): {
  wordsTotal: number | null;
  pagesTotal: number | null;
  pagesRead: number | null;
  progress: number;
} {
  const wordsTotal = toOptionalInt(refs.wordsInput.value);
  const pagesTotal = toOptionalInt(refs.pagesTotalInput.value);
  let pagesRead = toOptionalInt(refs.pagesReadInput.value);
  let progress = clamp(Number(refs.progressInput.value || 0), 0, PROGRESS_MAX);
  if (!wordsTotal && !pagesTotal) {
    throw new Error("Enter estimated words or total pages.");
  }

  if (pagesTotal) {
    pagesRead ??= Math.round((progress / PROGRESS_MAX) * pagesTotal);
    pagesRead = clamp(pagesRead, 0, pagesTotal);
    progress =
      Math.round(
        (pagesRead / pagesTotal) * PROGRESS_MAX * PROGRESS_DECIMAL_SCALE,
      ) / PROGRESS_DECIMAL_SCALE;
    return {
      wordsTotal,
      pagesTotal,
      pagesRead,
      progress,
    };
  }

  return {
    wordsTotal,
    pagesTotal,
    progress,
    pagesRead: null,
  };
}

/**
 *
 * @param refs
 */
export function validatedShelfSelection(refs: BookFormRefs): string {
  const shelf = refs.shelfSelectInput.value;
  if (shelf === SHELF_SELECT_CREATE_NEW) {
    throw new Error(
      "Choose a shelf or create a new one from the shelf selector.",
    );
  }
  return shelf;
}

export { BOOK_STATUS_TO_READ as DEFAULT_STATUS } from "./status.js";
