import type { Book, BookFormRefs, LookupControl } from "../../types/types.js";
import { uid } from "../dom.js";
import {
    fillScheduledDayControls,
    readScheduledDaySelection,
    resetScheduledDayControls,
} from "./form_scheduled_days.js";
import {
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
import { bookCoverSrc, normalizeBook } from "./model.js";
import { BOOK_STATUS_READ } from "./status_catalog.js";
import { toOptionalInt } from "./utils.js";

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
    const formRefs = refs;
    formRefs.form.reset();
    formRefs.bookId.value = "";
    formRefs.coverUrl.value = "";
    formRefs.coverLocal.value = "";
    formRefs.coverUploadInput.value = "";
    formRefs.author.value = "";
    formRefs.lookupMeta.dataset.lookupNote = "";
    formRefs.lookupMeta.textContent = "";
    formRefs.progressInput.value = DEFAULT_PROGRESS;
    formRefs.priorityInput.value = DEFAULT_PRIORITY;
    formRefs.difficultyInput.value = DEFAULT_DIFFICULTY;
    formRefs.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
    formRefs.afterBookInput.value = "";
    formRefs.blockedByInput.value = "";
    formRefs.statusSelectInput.value = DEFAULT_STATUS;
    formRefs.finishedAtInput.value = "";
    syncFinishedAtFieldState(formRefs);
    formRefs.shelfSelectInput.value = "";
    resetScheduledDayControls(formRefs);
    setCoverPreview(formRefs, "");
    lookupControl.clearResults();
}

/**
 * Fills form controls from an existing book for edit mode.
 * @param refs Book form references to populate.
 * @param book Existing book record being edited.
 */
export function fillForm(refs: BookFormRefs, book: Book): void {
    const formRefs = refs;
    formRefs.bookId.value = book.book_id;
    formRefs.titleInput.value = fallbackText(book.title);
    setOptionalIntegerInputValue(formRefs.wordsInput, book.words_total);
    setOptionalIntegerInputValue(formRefs.pagesTotalInput, book.pages_total);
    setOptionalIntegerInputValue(formRefs.pagesReadInput, book.pages_read);
    formRefs.progressInput.value = fallbackNumberText(
        book.progress_percent,
        DEFAULT_PROGRESS,
    );
    formRefs.priorityInput.value = fallbackNumberText(
        book.priority,
        DEFAULT_PRIORITY,
    );
    formRefs.difficultyInput.value = fallbackNumberText(
        book.difficulty,
        DEFAULT_DIFFICULTY,
    );
    formRefs.minBlocksInput.value = fallbackNumberText(
        book.min_blocks_per_session,
        DEFAULT_MIN_BLOCKS,
    );
    setOptionalIntegerInputValue(
        formRefs.maxMinutesInput,
        book.max_minutes_per_day,
    );
    formRefs.deadlineInput.value = fallbackText(book.deadline);
    formRefs.blockedByInput.value = fallbackText(book.blocked_by);
    formRefs.statusSelectInput.value = fallbackText(
        book.status,
        DEFAULT_STATUS,
    );
    formRefs.finishedAtInput.value = fallbackText(book.finished_at);
    syncFinishedAtFieldState(formRefs);
    fillScheduledDayControls(formRefs, book.scheduled_days);
    formRefs.coverUrl.value = fallbackText(book.cover_url);
    formRefs.coverLocal.value = fallbackText(book.cover_local_path);
    formRefs.author.value = fallbackText(book.author);
    formRefs.lookupMeta.dataset.lookupNote = fallbackText(book.lookup_note);
    formRefs.lookupMeta.textContent = fallbackText(book.lookup_note);
    formRefs.searchInput.value = fallbackText(book.title);
    setCoverPreview(formRefs, bookCoverSrc(book));
}

/**
 * Parses current form values into a normalized `Book` payload.
 * @param refs Book form references to read.
 * @returns Normalized book model ready for save.
 */
export function parseFormBook(refs: BookFormRefs): Book {
    const parsed = deriveLengthAndProgress(refs);
    const shelf = validatedShelfSelection(refs);
    const status = validatedStatusSelection(refs);
    const scheduledDays = readScheduledDaySelection(refs);
    if (scheduledDays.length === 0) {
        throw new Error("Select at least one scheduled day.");
    }
    let { progress, pagesRead } = parsed;

    if (status === BOOK_STATUS_READ) {
        progress = 100;
        if (typeof parsed.pagesTotal === "number" && parsed.pagesTotal > 0) {
            pagesRead = parsed.pagesTotal;
        }
    }

    return normalizeBook({
        shelf,
        status,
        title: requiredTitle(refs),
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
        scheduled_days: scheduledDays,
        cover_url: refs.coverUrl.value.trim(),
        cover_local_path: refs.coverLocal.value.trim(),
        lookup_note: refs.lookupMeta.dataset.lookupNote ?? "",
    });
}

export {
    applyLookupItem,
    applyUploadedCover,
} from "./form_state_lookup.js";
