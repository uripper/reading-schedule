import type { BookStatus, BookFormRefs } from "@reading-schedule/contracts";
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

export const DEFAULT_PROGRESS = "0";
export const DEFAULT_PRIORITY = "3";
export const DEFAULT_DIFFICULTY = "3";
export const DEFAULT_MIN_BLOCKS = "1";
export const DEFAULT_STATUS = BOOK_STATUS_TO_READ;

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
 * @param refs - Form DOM references for the book dialog.
 * @param src - URL/path to show in the preview.
 */
export function setCoverPreview(refs: BookFormRefs, src: string): void {
  const PREVIEW = refs.coverPreview;
  const HAS_SRC = src !== "";
  if (HAS_SRC) {
    PREVIEW.src = src;
  } else {
    PREVIEW.src = COVER_PLACEHOLDER;
  }
  PREVIEW.classList.toggle("is-empty", !HAS_SRC);
}

/**
 * Writes optional integer values into text inputs without `"null"` artifacts.
 * @param inputNode - Input node to update.
 * @param value - Number to render, or empty when missing.
 */
export function setOptionalIntegerInputValue(
  inputNode: HTMLInputElement,
  value: number | null | undefined,
): void {
  const TARGET_INPUT = inputNode;
  TARGET_INPUT.value = "";
  if (value === null || value === undefined) {
    return;
  }
  TARGET_INPUT.value = String(value);
}

/**
 * Returns fallback text when a value is empty, null, or undefined.
 * @param value - Candidate text value.
 * @param fallback - Value used when `value` is missing.
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
 * @param value - Candidate numeric value.
 * @param fallback - Value used when `value` is missing.
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
 * @param refs - Form DOM references for the book dialog.
 * @returns Trimmed title text.
 * @throws {Error} Thrown when the title is blank.
 */
export function requiredTitle(refs: BookFormRefs): string {
  const TITLE = refs.titleInput.value.trim();
  if (!TITLE) {
    throw new Error("Title is required.");
  }
  return TITLE;
}

/**
 * Reads and normalizes selected status into a supported book status.
 * @param refs - Form DOM references for the book dialog.
 * @returns Supported book status value.
 */
export function validatedStatusSelection(refs: BookFormRefs): BookStatus {
  const RAW = String(refs.statusSelectInput.value).trim();
  if (RAW === BOOK_STATUS_READ) {
    return BOOK_STATUS_READ;
  }
  if (RAW === BOOK_STATUS_IN_PROGRESS) {
    return BOOK_STATUS_IN_PROGRESS;
  }
  if (RAW === BOOK_STATUS_DROPPED) {
    return BOOK_STATUS_DROPPED;
  }
  return BOOK_STATUS_TO_READ;
}

/**
 * Shows or hides finished-date controls based on selected status.
 * @param refs - Form DOM references for the book dialog.
 * @param status - Current normalized status value.
 */
function toggleFinishedAtInput(refs: BookFormRefs, status: BookStatus): void {
  const { finishedAtField, finishedAtInput } = refs;
  const IS_READ = status === BOOK_STATUS_READ;
  finishedAtField.hidden = !IS_READ;
  finishedAtInput.disabled = !IS_READ;
  if (!IS_READ) {
    return;
  }
  if (finishedAtInput.value) {
    return;
  }
  finishedAtInput.value = todayDateKey();
}

/**
 * Synchronizes finished-date field visibility with current status selection.
 * @param refs - Form DOM references for the book dialog.
 */
export function syncFinishedAtFieldState(refs: BookFormRefs): void {
  const STATUS = validatedStatusSelection(refs);
  toggleFinishedAtInput(refs, STATUS);
}

/**
 * Parses and validates length/progress inputs into normalized numeric values.
 * @param refs - Form DOM references for the book dialog.
 * @returns Parsed length and progress values for normalization.
 * @throws {Error} Thrown when neither words nor page total is provided.
 */
export function deriveLengthAndProgress(refs: BookFormRefs): {
  wordsTotal: number | null;
  pagesTotal: number | null;
  pagesRead: number | null;
  progress: number;
} {
  const WORDS_TOTAL = toOptionalInt(refs.wordsInput.value);
  const PAGES_TOTAL = toOptionalInt(refs.pagesTotalInput.value);
  let pagesRead = toOptionalInt(refs.pagesReadInput.value);
  let progress = clamp(Number(refs.progressInput.value), 0, PROGRESS_MAX);
  const HAS_WORDS_TOTAL = WORDS_TOTAL !== null && WORDS_TOTAL > 0;
  const HAS_PAGES_TOTAL = PAGES_TOTAL !== null && PAGES_TOTAL > 0;
  if (!HAS_WORDS_TOTAL && !HAS_PAGES_TOTAL) {
    throw new Error("Enter estimated words or total pages.");
  }

  if (HAS_PAGES_TOTAL) {
    pagesRead ??= Math.round((progress / PROGRESS_MAX) * PAGES_TOTAL);
    pagesRead = clamp(pagesRead, 0, PAGES_TOTAL);
    progress =
      Math.round(
        (pagesRead / PAGES_TOTAL) * PROGRESS_MAX * PROGRESS_DECIMAL_SCALE,
      ) / PROGRESS_DECIMAL_SCALE;
    return {
      pagesRead,
      pagesTotal: PAGES_TOTAL,
      progress,
      wordsTotal: WORDS_TOTAL,
    };
  }

  return {
    pagesRead: null,
    pagesTotal: PAGES_TOTAL,
    progress,
    wordsTotal: WORDS_TOTAL,
  };
}

/**
 * Reads shelf selection and rejects the placeholder create-new option.
 * @param refs - Form DOM references for the book dialog.
 * @returns Selected shelf id.
 * @throws {Error} Thrown when no valid shelf is selected.
 */
export function validatedShelfSelection(refs: BookFormRefs): string {
  const SHELF = refs.shelfSelectInput.value;
  if (SHELF === SHELF_SELECT_CREATE_NEW) {
    throw new Error(
      "Choose a shelf or create a new one from the shelf selector.",
    );
  }
  return SHELF;
}
