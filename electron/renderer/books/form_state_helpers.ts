import { dayKey } from "../calendar/utils.js";
import { COVER_PLACEHOLDER } from "./constants.js";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
} from "./status_catalog.js";
import { clamp, toOptionalInt } from "./utils.js";
import type { BookStatus, BookFormRefs } from "../../types/types.js";

export const DEFAULT_PROGRESS = "0";
export const DEFAULT_PRIORITY = "3";
export const DEFAULT_DIFFICULTY = "3";
export const DEFAULT_MIN_BLOCKS = "1";

export const CUSTOM_COVER_NOTE = "Custom cover uploaded.";

const PROGRESS_MAX = 100;
const PROGRESS_DECIMAL_SCALE = 10;

/**
 * Produces today's local date key for default finished-date values.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDateKey(): string {
  return dayKey(new Date());
}

/**
 * Updates the book cover preview image and empty-state class.
 * @param refs Form DOM references for the book dialog.
 * @param src URL/path to show in the preview.
 */
export function setCoverPreview(refs: BookFormRefs, src: string): void {
  const preview = refs.coverPreview;
  const hasSrc = src !== "";
  if (hasSrc) {
    preview.src = src;
  } else {
    preview.src = COVER_PLACEHOLDER;
  }
  preview.classList.toggle("is-empty", !hasSrc);
}

/**
 * Writes optional integer values into text inputs without `"null"` artifacts.
 * @param inputNode Input node to update.
 * @param value Number to render, or empty when missing.
 */
export function setOptionalIntegerInputValue(
  inputNode: HTMLInputElement,
  value: number | null | undefined,
): void {
  const targetInput = inputNode;
  targetInput.value = "";
  if (value === null || value === undefined) {
    return;
  }
  targetInput.value = String(value);
}

/**
 * Returns fallback text when a value is empty, null, or undefined.
 * @param value Candidate text value.
 * @param fallback Value used when `value` is missing.
 * @returns `value` when present; otherwise `fallback`.
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
 * Returns number text or fallback when numeric value is absent/zero.
 * @param value Candidate numeric value.
 * @param fallback Value used when `value` is missing.
 * @returns String form of `value` or the provided fallback.
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
 * Reads and validates required title input.
 * @param refs Form DOM references for the book dialog.
 * @returns Trimmed title text.
 * @throws {Error} Thrown when the title is blank.
 */
export function requiredTitle(refs: BookFormRefs): string {
  const title = refs.titleInput.value.trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  return title;
}

/**
 * Reads and normalizes selected status into a supported book status.
 * @param refs Form DOM references for the book dialog.
 * @returns Supported book status value.
 */
export function validatedStatusSelection(refs: BookFormRefs): BookStatus {
  const raw = String(refs.statusSelectInput.value).trim();
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
 * Shows or hides finished-date controls based on selected status.
 * @param refs Form DOM references for the book dialog.
 * @param status Current normalized status value.
 */
function toggleFinishedAtInput(refs: BookFormRefs, status: BookStatus): void {
  const {finishedAtField, finishedAtInput} = refs;
  const isRead = status === BOOK_STATUS_READ;
  finishedAtField.hidden = !isRead;
  finishedAtInput.disabled = !isRead;
  if (!isRead) {
    return;
  }
  if (finishedAtInput.value) {
    return;
  }
  finishedAtInput.value = todayDateKey();
}

/**
 * Synchronizes finished-date field visibility with current status selection.
 * @param refs Form DOM references for the book dialog.
 */
export function syncFinishedAtFieldState(refs: BookFormRefs): void {
  const status = validatedStatusSelection(refs);
  toggleFinishedAtInput(refs, status);
}

/**
 * Parses and validates length/progress inputs into normalized numeric values.
 * @param refs Form DOM references for the book dialog.
 * @returns Parsed length and progress values for normalization.
 * @throws {Error} Thrown when neither words nor page total is provided.
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
  let progress = clamp(Number(refs.progressInput.value), 0, PROGRESS_MAX);
  const hasWordsTotal = wordsTotal !== null && wordsTotal > 0;
  const hasPagesTotal = pagesTotal !== null && pagesTotal > 0;
  if (!hasWordsTotal && !hasPagesTotal) {
    throw new Error("Enter estimated words or total pages.");
  }

  if (hasPagesTotal) {
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
 * Reads shelf selection and rejects the placeholder create-new option.
 * @param refs Form DOM references for the book dialog.
 * @returns Selected shelf id.
 * @throws {Error} Thrown when no valid shelf is selected.
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

export const DEFAULT_STATUS = BOOK_STATUS_TO_READ;
