/**
 * Builds, clears, and normalizes the desktop book form state used by the
 * add-book and edit-book flows.
 */
import type {
    Book,
    BookFormRefs,
    BookWeekday,
    LookupControl,
} from "../../types/types.ts";
import { uid } from "../dom.ts";
import {
    fillScheduledDayControls,
    readScheduledDaySelection,
    resetScheduledDayControls,
} from "./form_scheduled_days.ts";
import {
    clearOptionalDateInputValue,
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
    setOptionalDateInputValue,
    setOptionalIntegerInputValue,
    syncFinishedAtFieldState,
    validatedShelfSelection,
    validatedStatusSelection,
} from "./form-state-helpers.ts";
import { bookCoverSrc, normalizeBook } from "./model-normalize.ts";
import { BOOK_STATUS_READ } from "./status_catalog.ts";
import { toOptionalInt } from "./utils.ts";

/**
 * Parsed reading-length values derived from the current form inputs.
 */
type ParsedReadingState = ReturnType<typeof deriveLengthAndProgress>;

/**
 * Normalized progress values ready for persistence.
 */
type NormalizedProgress = {
    progress: number;
    pagesRead: number | null;
};

/**
 * Inputs needed to assemble the planning-related portion of a saved book.
 */
type NormalizedPlanningFieldsArgs = {
    refs: BookFormRefs;
    parsed: ParsedReadingState;
    status: Book["status"];
    shelf: string;
    scheduledDays: BookWeekday[];
};

/**
 * Synchronizes finished-date field visibility after status changes.
 * @param refs - Book form references containing status and date controls.
 */
export function syncFinishedAtField(refs: BookFormRefs): void {
    syncFinishedAtFieldState(refs);
}

/**
 * Clears lookup-driven metadata and relationship fields from the form.
 * @param refs - Book form references containing the lookup controls.
 */
function clearLookupFields(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.author.value = "";
    FORM_REFS.lookupMeta.dataset.lookupNote = "";
    FORM_REFS.lookupMeta.textContent = "";
    FORM_REFS.afterBookInput.value = "";
    FORM_REFS.blockedByInput.value = "";
}

/**
 * Restores numeric form inputs to their default add-book values.
 * @param refs - Book form references containing numeric controls.
 */
function clearNumericDefaults(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.progressInput.value = DEFAULT_PROGRESS;
    FORM_REFS.priorityInput.value = DEFAULT_PRIORITY;
    FORM_REFS.difficultyInput.value = DEFAULT_DIFFICULTY;
    FORM_REFS.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
}

/**
 * Resets select-like fields and scheduled-day controls back to defaults.
 * @param refs - Book form references containing status and scheduling inputs.
 */
function clearSelectionFields(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    FORM_REFS.statusSelectInput.value = DEFAULT_STATUS;
    clearOptionalDateInputValue(FORM_REFS.deadlineInput);
    clearOptionalDateInputValue(FORM_REFS.finishedAtInput);
    FORM_REFS.shelfSelectInput.value = "";
    syncFinishedAtFieldState(FORM_REFS);
    resetScheduledDayControls(FORM_REFS);
}

/**
 * Clears local and remote cover values and removes the preview image.
 * @param refs - Book form references containing cover inputs.
 */
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

/**
 * Fills the length and progress fields from an existing book record.
 * @param refs - Book form references containing length-related controls.
 * @param book - Existing book record used to seed the form.
 */
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

/**
 * Fills priority and reading-difficulty controls from an existing book.
 * @param refs - Book form references containing planning inputs.
 * @param book - Existing book record used to seed the form.
 */
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

/**
 * Fills deadline-related planning inputs from an existing book.
 * @param refs - Book form references containing deadline inputs.
 * @param book - Existing book record used to seed the form.
 */
function fillDeadlineFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    setOptionalIntegerInputValue(
        FORM_REFS.maxMinutesInput,
        book.max_minutes_per_day,
    );
    setOptionalDateInputValue(FORM_REFS.deadlineInput, book.deadline);
}

/**
 * Fills planning-related controls from an existing book record.
 * @param refs - Book form references containing planning inputs.
 * @param book - Existing book record used to seed the form.
 */
function fillPlanningFields(refs: BookFormRefs, book: Book): void {
    fillPriorityFields(refs, book);
    fillDeadlineFields(refs, book);
}

/**
 * Fills status, completion, and scheduled-day controls from an existing book.
 * @param refs - Book form references containing status-related inputs.
 * @param book - Existing book record used to seed the form.
 */
function fillStatusFields(refs: BookFormRefs, book: Book): void {
    const FORM_REFS = refs;
    FORM_REFS.blockedByInput.value = fallbackText(book.blocked_by);
    FORM_REFS.statusSelectInput.value = fallbackText(
        book.status,
        DEFAULT_STATUS,
    );
    setOptionalDateInputValue(FORM_REFS.finishedAtInput, book.finished_at);
    syncFinishedAtFieldState(FORM_REFS);
    fillScheduledDayControls(FORM_REFS, book.scheduled_days);
}

/**
 * Fills lookup and cover fields from an existing book record.
 * @param refs - Book form references containing lookup-related inputs.
 * @param book - Existing book record used to seed the form.
 */
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

/**
 * Reads the selected scheduled days and enforces the minimum save constraint.
 * @param refs - Book form references containing scheduled-day controls.
 * @returns The validated scheduled-day selection.
 */
function validatedScheduledDays(refs: BookFormRefs): BookWeekday[] {
    const SCHEDULED_DAYS = readScheduledDaySelection(refs);
    if (SCHEDULED_DAYS.length === 0) {
        throw new Error("Select at least one scheduled day.");
    }
    return SCHEDULED_DAYS;
}

/**
 * Normalizes progress fields for save, forcing completed books to 100%.
 * @param parsed - Parsed reading-length state from the form.
 * @param status - Selected book status for the current save.
 * @returns Normalized progress values for persistence.
 */
function normalizedProgressState(
    parsed: ParsedReadingState,
    status: Book["status"],
): NormalizedProgress {
    if (status !== BOOK_STATUS_READ) {
        return { pagesRead: parsed.pagesRead, progress: parsed.progress };
    }
    let { pagesRead } = parsed;
    if (typeof parsed.pagesTotal === "number" && parsed.pagesTotal > 0) {
        pagesRead = parsed.pagesTotal;
    }
    return { pagesRead, progress: 100 };
}

/**
 * Normalizes author, title, lookup, and cover fields into a partial book.
 * @param refs - Book form references containing identity-related controls.
 * @returns Identity and metadata fields ready to merge into a saved book.
 */
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

/**
 * Normalizes planning, progress, and scheduling fields into a partial book.
 * @param args - Normalized planning inputs derived from the current form state.
 * @returns Planning-related fields ready to merge into a saved book.
 */
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
