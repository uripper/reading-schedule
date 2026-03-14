import type { Book, BookFormRefs, LookupControl } from "../../types/types.ts";
import { uid } from "../dom.ts";
import {
    fillScheduledDayControls,
    readScheduledDaySelection,
    resetScheduledDayControls,
} from "./form_scheduled_days.ts";
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
} from "./form_state_helpers.ts";
import { bookCoverSrc, normalizeBook } from "./model_normalize.ts";
import { BOOK_STATUS_READ } from "./status_catalog.ts";
import { toOptionalInt } from "./utils.ts";

type ParsedReadingState = ReturnType<typeof deriveLengthAndProgress>;
type NormalizedProgress = {
    progress: number;
    pagesRead: number | null;
};
type NormalizedPlanningFieldsArgs = {
    refs: BookFormRefs;
    parsed: ParsedReadingState;
    status: Book["status"];
    shelf: string;
    scheduledDays: number[];
};

/**
 * Synchronizes finished-date field visibility after status changes.
 * @param refs - Book form references containing status and date controls.
 */
export function syncFinishedAtField(refs: BookFormRefs): void {
    syncFinishedAtFieldState(refs);
}

function clearLookupFields(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.author.value = "";
    FORM_REFS.lookupMeta.dataset.lookupNote = "";
    FORM_REFS.lookupMeta.textContent = "";
    FORM_REFS.afterBookInput.value = "";
    FORM_REFS.blockedByInput.value = "";
}

function clearNumericDefaults(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.progressInput.value = DEFAULT_PROGRESS;
    FORM_REFS.priorityInput.value = DEFAULT_PRIORITY;
    FORM_REFS.difficultyInput.value = DEFAULT_DIFFICULTY;
    FORM_REFS.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
}

function clearSelectionFields(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.statusSelectInput.value = DEFAULT_STATUS;
    FORM_REFS.finishedAtInput.value = "";
    FORM_REFS.shelfSelectInput.value = "";
    syncFinishedAtFieldState(FORM_REFS);
    resetScheduledDayControls(FORM_REFS);
}

function clearCoverFields(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.coverUrl.value = "";
    FORM_REFS.coverLocal.value = "";
    FORM_REFS.coverUploadInput.value = "";
    setCoverPreview(FORM_REFS, "");
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
    clearCoverFields(FORM_REFS);
    clearLookupFields(FORM_REFS);
    clearNumericDefaults(FORM_REFS);
    clearSelectionFields(FORM_REFS);
    lookupControl.clearResults();
}

function fillLengthFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    setOptionalIntegerInputValue(FORM_REFS.wordsInput, book.words_total);
    setOptionalIntegerInputValue(FORM_REFS.pagesTotalInput, book.pages_total);
    setOptionalIntegerInputValue(FORM_REFS.pagesReadInput, book.pages_read);
    FORM_REFS.progressInput.value = fallbackNumberText(
        book.progress_percent,
        DEFAULT_PROGRESS,
    );
}

function fillPriorityFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
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
}

function fillDeadlineFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    setOptionalIntegerInputValue(
        FORM_REFS.maxMinutesInput,
        book.max_minutes_per_day,
    );
    FORM_REFS.deadlineInput.value = fallbackText(book.deadline);
}

function fillPlanningFields(refs: BookFormRefs, book: Book): void {
    fillPriorityFields(refs, book);
    fillDeadlineFields(refs, book);
}

function fillStatusFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    FORM_REFS.blockedByInput.value = fallbackText(book.blocked_by);
    FORM_REFS.statusSelectInput.value = fallbackText(
        book.status,
        DEFAULT_STATUS,
    );
    FORM_REFS.finishedAtInput.value = fallbackText(book.finished_at);
    syncFinishedAtFieldState(FORM_REFS);
    fillScheduledDayControls(FORM_REFS, book.scheduled_days);
}

function fillLookupFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    FORM_REFS.coverUrl.value = fallbackText(book.cover_url);
    FORM_REFS.coverLocal.value = fallbackText(book.cover_local_path);
    FORM_REFS.author.value = fallbackText(book.author);
    FORM_REFS.lookupMeta.dataset.lookupNote = fallbackText(book.lookup_note);
    FORM_REFS.lookupMeta.textContent = fallbackText(book.lookup_note);
    FORM_REFS.searchInput.value = fallbackText(book.title);
    setCoverPreview(FORM_REFS, bookCoverSrc(book));
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
    fillLengthFields(FORM_REFS, book);
    fillPlanningFields(FORM_REFS, book);
    fillStatusFields(FORM_REFS, book);
    fillLookupFields(FORM_REFS, book);
}

function validatedScheduledDays(refs: BookFormRefs): number[] {
    const SCHEDULED_DAYS = readScheduledDaySelection(refs);
    if (SCHEDULED_DAYS.length === 0) {
        throw new Error("Select at least one scheduled day.");
    }
    return SCHEDULED_DAYS;
}

function normalizedProgressState(
    parsed: ParsedReadingState,
    status: Book["status"],
): NormalizedProgress {
    if (status !== BOOK_STATUS_READ) {
        return { pagesRead: parsed.pagesRead, progress: parsed.progress };
    }
    let pagesRead = parsed.pagesRead;
    if (typeof parsed.pagesTotal === "number" && parsed.pagesTotal > 0) {
        pagesRead = parsed.pagesTotal;
    }
    return { pagesRead, progress: 100 };
}

function normalizedIdentityFields(refs: BookFormRefs): Partial<Book> {
    return {
        author: refs.author.value.trim(),
        blocked_by: refs.blockedByInput.value,
        book_id: refs.bookId.value || uid(),
        cover_local_path: refs.coverLocal.value.trim(),
        cover_url: refs.coverUrl.value.trim(),
        deadline: refs.deadlineInput.value,
        finished_at: refs.finishedAtInput.value,
        lookup_note: refs.lookupMeta.dataset.lookupNote ?? "",
        title: requiredTitle(refs),
    };
}

function normalizedPlanningFields({
    refs,
    parsed,
    scheduledDays,
    shelf,
    status,
}: NormalizedPlanningFieldsArgs): Partial<Book> {
    const PROGRESS_STATE = normalizedProgressState(parsed, status);
    return {
        difficulty: Number(refs.difficultyInput.value || DEFAULT_DIFFICULTY),
        max_minutes_per_day: toOptionalInt(refs.maxMinutesInput.value),
        min_blocks_per_session: Number(
            refs.minBlocksInput.value || DEFAULT_MIN_BLOCKS,
        ),
        pages_read: PROGRESS_STATE.pagesRead,
        pages_total: parsed.pagesTotal,
        priority: Number(refs.priorityInput.value || DEFAULT_PRIORITY),
        progress_percent: PROGRESS_STATE.progress,
        scheduled_days: scheduledDays,
        shelf,
        status,
        words_total: parsed.wordsTotal,
    };
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
    const SCHEDULED_DAYS = validatedScheduledDays(refs);
    return normalizeBook({
        ...normalizedIdentityFields(refs),
        ...normalizedPlanningFields({
            parsed: PARSED,
            refs,
            scheduledDays: SCHEDULED_DAYS,
            shelf: SHELF,
            status: STATUS,
        }),
    });
}
