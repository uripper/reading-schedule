import { uid } from "../dom.js";
import { noteFromLookup, syncProgressAndPages } from "../book_lookup.js";
import { bookCoverSrc, normalizeBook } from "./model.js";
import {
  CUSTOM_COVER_NOTE,
  DEFAULT_DIFFICULTY,
  DEFAULT_MIN_BLOCKS,
  DEFAULT_PRIORITY,
  DEFAULT_PROGRESS,
  DEFAULT_STATUS,
  deriveLengthAndProgress,
  fallbackNumberText,
  fallbackText,
  requiredTitle,
  setCoverPreview,
  setOptionalIntegerInputValue,
  syncFinishedAtFieldState,
  validatedShelfSelection,
  validatedStatusSelection,
} from "./form_state_helpers.js";
import { BOOK_STATUS_READ } from "./status.js";
import { toOptionalInt } from "./utils.js";
import type { Book } from "./types.js";
import type { BookFormRefs } from "./form_refs.js";
import type { BookLookupItem } from "../app/types.js";
import type { ProgressSyncInputs } from "../book_lookup/helpers.js";

interface LookupControl {
  clearResults(): void;
}

/**
 * Synchronizes finished-date field visibility after status changes.
 * @param refs Book form references containing status and date controls.
 */
export function syncFinishedAtField(refs: BookFormRefs): void {
  syncFinishedAtFieldState(refs);
}

/**
 * Resets form inputs to default add-book values and clears lookup UI state.
 * @param refs Book form references to clear.
 * @param lookupControl Lookup controller used to reset search results.
 */
export function clearForm(
  refs: BookFormRefs,
  lookupControl: LookupControl,
): void {
  refs.form.reset();
  refs.bookId.value = "";
  refs.coverUrl.value = "";
  refs.coverLocal.value = "";
  refs.coverUploadInput.value = "";
  refs.author.value = "";
  refs.lookupMeta.dataset.lookupNote = "";
  refs.lookupMeta.textContent = "";
  refs.progressInput.value = DEFAULT_PROGRESS;
  refs.priorityInput.value = DEFAULT_PRIORITY;
  refs.difficultyInput.value = DEFAULT_DIFFICULTY;
  refs.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
  refs.afterBookInput.value = "";
  refs.blockedByInput.value = "";
  refs.statusSelectInput.value = DEFAULT_STATUS;
  refs.finishedAtInput.value = "";
  syncFinishedAtFieldState(refs);
  refs.shelfSelectInput.value = "";
  setCoverPreview(refs, "");
  lookupControl.clearResults();
}

/**
 * Fills form controls from an existing book for edit mode.
 * @param refs Book form references to populate.
 * @param book Existing book record being edited.
 */
export function fillForm(refs: BookFormRefs, book: Book): void {
  refs.bookId.value = book.book_id;
  refs.titleInput.value = fallbackText(book.title);
  setOptionalIntegerInputValue(refs.wordsInput, book.words_total);
  setOptionalIntegerInputValue(refs.pagesTotalInput, book.pages_total);
  setOptionalIntegerInputValue(refs.pagesReadInput, book.pages_read);
  refs.progressInput.value = fallbackNumberText(
    book.progress_percent,
    DEFAULT_PROGRESS,
  );
  refs.priorityInput.value = fallbackNumberText(
    book.priority,
    DEFAULT_PRIORITY,
  );
  refs.difficultyInput.value = fallbackNumberText(
    book.difficulty,
    DEFAULT_DIFFICULTY,
  );
  refs.minBlocksInput.value = fallbackNumberText(
    book.min_blocks_per_session,
    DEFAULT_MIN_BLOCKS,
  );
  setOptionalIntegerInputValue(refs.maxMinutesInput, book.max_minutes_per_day);
  refs.deadlineInput.value = fallbackText(book.deadline);
  refs.blockedByInput.value = fallbackText(book.blocked_by);
  refs.statusSelectInput.value = fallbackText(book.status, DEFAULT_STATUS);
  refs.finishedAtInput.value = fallbackText(book.finished_at);
  syncFinishedAtFieldState(refs);
  refs.coverUrl.value = fallbackText(book.cover_url);
  refs.coverLocal.value = fallbackText(book.cover_local_path);
  refs.author.value = fallbackText(book.author);
  refs.lookupMeta.dataset.lookupNote = fallbackText(book.lookup_note);
  refs.lookupMeta.textContent = fallbackText(book.lookup_note);
  refs.searchInput.value = fallbackText(book.title);
  setCoverPreview(refs, bookCoverSrc(book));
}

/**
 * Parses current form values into a normalized `Book` payload.
 * @param refs Book form references to read.
 * @returns Normalized book model ready for save.
 */
export function parseFormBook(refs: BookFormRefs): Book {
  const title = requiredTitle(refs);
  const parsed = deriveLengthAndProgress(refs);
  const shelf = validatedShelfSelection(refs);
  const status = validatedStatusSelection(refs);
  let { progress, pagesRead } = parsed;

  if (status === BOOK_STATUS_READ) {
    progress = 100;
    if (parsed.pagesTotal) {
      pagesRead = parsed.pagesTotal;
    }
  }

  return normalizeBook({
    title,
    shelf,
    status,
    finished_at: refs.finishedAtInput.value,
    book_id: refs.bookId.value || uid(),
    author: refs.author.value.trim(),
    words_total: parsed.wordsTotal,
    pages_total: parsed.pagesTotal,
    pages_read: pagesRead,
    progress_percent: progress,
    priority: Number(refs.priorityInput.value || DEFAULT_PRIORITY),
    difficulty: Number(refs.difficultyInput.value || DEFAULT_DIFFICULTY),
    min_blocks_per_session: Number(
      refs.minBlocksInput.value || DEFAULT_MIN_BLOCKS,
    ),
    max_minutes_per_day: toOptionalInt(refs.maxMinutesInput.value),
    deadline: refs.deadlineInput.value,
    blocked_by: refs.blockedByInput.value,
    cover_url: refs.coverUrl.value.trim(),
    cover_local_path: refs.coverLocal.value.trim(),
    lookup_note: refs.lookupMeta.dataset.lookupNote || "",
  });
}

/**
 * Applies a selected lookup result into editable form fields.
 * @param refs Book form references to update.
 * @param item Lookup result chosen by the user.
 */
export function applyLookupItem(
  refs: BookFormRefs,
  item: BookLookupItem,
): void {
  refs.titleInput.value = item.title || refs.titleInput.value;
  refs.searchInput.value = item.title || refs.searchInput.value;
  refs.author.value = item.author || refs.author.value;
  refs.coverUrl.value = item.cover_url || "";
  refs.coverLocal.value = "";

  if (!toOptionalInt(refs.wordsInput.value) && item.words_estimate) {
    refs.wordsInput.value = String(item.words_estimate);
  }
  if (!toOptionalInt(refs.pagesTotalInput.value) && item.pages_estimate) {
    refs.pagesTotalInput.value = String(item.pages_estimate);
  }

  refs.lookupMeta.dataset.lookupNote = noteFromLookup(item);
  refs.lookupMeta.textContent = noteFromLookup(item);
  setCoverPreview(refs, item.cover_url || "");

  const progressSyncRefs: ProgressSyncInputs = {
    pagesTotalInput: refs.pagesTotalInput,
    pagesReadInput: refs.pagesReadInput,
    progressInput: refs.progressInput,
  };
  syncProgressAndPages(progressSyncRefs, "pages");
}

/**
 * Applies uploaded local cover metadata and updates preview/note fields.
 * @param refs Book form references to update.
 * @param localCoverPath Planner-saved local cover path.
 * @param fileName Optional original file name for display note.
 */
export function applyUploadedCover(
  refs: BookFormRefs,
  localCoverPath: string,
  fileName = "",
): void {
  const normalizedPath = String(localCoverPath || "").trim();
  if (!normalizedPath) {
    throw new Error("Could not save the uploaded cover.");
  }
  refs.coverLocal.value = normalizedPath;
  refs.coverUrl.value = "";

  let note = CUSTOM_COVER_NOTE;
  const normalizedFileName = String(fileName || "").trim();
  if (normalizedFileName) {
    note = `${CUSTOM_COVER_NOTE} ${normalizedFileName}`;
  }

  refs.lookupMeta.dataset.lookupNote = note;
  refs.lookupMeta.textContent = note;
  setCoverPreview(refs, normalizedPath);
}
