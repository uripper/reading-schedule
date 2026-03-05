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
 * @param refs - Book form references containing status and date controls.
 */
export function syncFinishedAtField(refs: BookFormRefs): void {
    syncFinishedAtFieldState(refs);
}

/**
 * Resets form inputs to default add-book values and clears lookup UI state.
 * @param refs - Book form references to clear.
 * @param lookupControl - Lookup controller used to reset search results.
 */
export function clearForm(
    refs: BookFormRefs,
    lookupControl: LookupControl,
): void {
    const FORM_REFS = refs;
    FORM_REFS.form.reset();
    FORM_REFS.bookId.value = "";
    FORM_REFS.coverUrl.value = "";
    FORM_REFS.coverLocal.value = "";
    FORM_REFS.coverUploadInput.value = "";
    FORM_REFS.author.value = "";
    FORM_REFS.lookupMeta.dataset.lookupNote = "";
    FORM_REFS.lookupMeta.textContent = "";
    FORM_REFS.progressInput.value = DEFAULT_PROGRESS;
    FORM_REFS.priorityInput.value = DEFAULT_PRIORITY;
    FORM_REFS.difficultyInput.value = DEFAULT_DIFFICULTY;
    FORM_REFS.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
    FORM_REFS.afterBookInput.value = "";
    FORM_REFS.blockedByInput.value = "";
    FORM_REFS.statusSelectInput.value = DEFAULT_STATUS;
    FORM_REFS.finishedAtInput.value = "";
    syncFinishedAtFieldState(FORM_REFS);
    FORM_REFS.shelfSelectInput.value = "";
    resetScheduledDayControls(FORM_REFS);
    setCoverPreview(FORM_REFS, "");
    lookupControl.clearResults();
}

/**
 * Fills form controls from an existing book for edit mode.
 * @param refs - Book form references to populate.
 * @param book - Existing book record being edited.
 */
export function fillForm(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    FORM_REFS.bookId.value = book.book_id;
    FORM_REFS.titleInput.value = fallbackText(book.title);
    setOptionalIntegerInputValue(FORM_REFS.wordsInput, book.words_total);
    setOptionalIntegerInputValue(FORM_REFS.pagesTotalInput, book.pages_total);
    setOptionalIntegerInputValue(FORM_REFS.pagesReadInput, book.pages_read);
    FORM_REFS.progressInput.value = fallbackNumberText(
        book.progress_percent,
        DEFAULT_PROGRESS,
    );
    FORM_REFS.priorityInput.value = fallbackNumberText(
        book.priority,
        DEFAULT_PRIORITY,
    );
    FORM_REFS.difficultyInput.value = fallbackNumberText(
        book.difficulty,
        DEFAULT_DIFFICULTY,
    );
    FORM_REFS.minBlocksInput.value = fallbackNumberText(
        book.min_blocks_per_session,
        DEFAULT_MIN_BLOCKS,
    );
    setOptionalIntegerInputValue(
        FORM_REFS.maxMinutesInput,
        book.max_minutes_per_day,
    );
    FORM_REFS.deadlineInput.value = fallbackText(book.deadline);
    FORM_REFS.blockedByInput.value = fallbackText(book.blocked_by);
    FORM_REFS.statusSelectInput.value = fallbackText(
        book.status,
        DEFAULT_STATUS,
    );
    FORM_REFS.finishedAtInput.value = fallbackText(book.finished_at);
    syncFinishedAtFieldState(FORM_REFS);
    fillScheduledDayControls(FORM_REFS, book.scheduled_days);
    FORM_REFS.coverUrl.value = fallbackText(book.cover_url);
    FORM_REFS.coverLocal.value = fallbackText(book.cover_local_path);
    FORM_REFS.author.value = fallbackText(book.author);
    FORM_REFS.lookupMeta.dataset.lookupNote = fallbackText(book.lookup_note);
    FORM_REFS.lookupMeta.textContent = fallbackText(book.lookup_note);
    FORM_REFS.searchInput.value = fallbackText(book.title);
    setCoverPreview(FORM_REFS, bookCoverSrc(book));
}

/**
 * Parses current form values into a normalized `Book` payload.
 * @param refs - Book form references to read.
 * @returns Normalized book model ready for save.
 */
export function parseFormBook(refs: BookFormRefs): Book {
    const PARSED = deriveLengthAndProgress(refs);
    const SHELF = validatedShelfSelection(refs);
    const STATUS = validatedStatusSelection(refs);
    const SCHEDULED_DAYS = readScheduledDaySelection(refs);
    if (SCHEDULED_DAYS.length === 0) {
        throw new Error("Select at least one scheduled day.");
    }
    let { progress, pagesRead } = PARSED;

    if (STATUS === BOOK_STATUS_READ) {
        progress = 100;
        if (typeof PARSED.pagesTotal === "number" && PARSED.pagesTotal > 0) {
            pagesRead = PARSED.pagesTotal;
        }
    }

    return normalizeBook({
        author: refs.author.value.trim(),
        blocked_by: refs.blockedByInput.value,
        book_id: refs.bookId.value || uid(),
        cover_local_path: refs.coverLocal.value.trim(),
        cover_url: refs.coverUrl.value.trim(),
        deadline: refs.deadlineInput.value,
        difficulty: Number(refs.difficultyInput.value || DEFAULT_DIFFICULTY),
        finished_at: refs.finishedAtInput.value,
        lookup_note: refs.lookupMeta.dataset.lookupNote ?? "",
        max_minutes_per_day: toOptionalInt(refs.maxMinutesInput.value),
        min_blocks_per_session: Number(
            refs.minBlocksInput.value || DEFAULT_MIN_BLOCKS,
        ),
        pages_read: pagesRead,
        pages_total: PARSED.pagesTotal,
        priority: Number(refs.priorityInput.value || DEFAULT_PRIORITY),
        progress_percent: progress,
        scheduled_days: SCHEDULED_DAYS,
        shelf: SHELF,
        status: STATUS,
        title: requiredTitle(refs),
        words_total: PARSED.wordsTotal,
    });
}

export {
    applyLookupItem,
    applyUploadedCover,
} from "./form_state_lookup.js";
