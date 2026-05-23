import type { Book, BookFormRefs } from "../../types/types.ts";
import { optionLabel } from "./after_book_picker_helpers.ts";
import { fillScheduledDayControls } from "./form_scheduled_days.ts";
import { setOptionalDateInputValue } from "./form-state-helpers.ts";
import { normalizeScheduledDays } from "./scheduled_days.ts";

const BULK_DIRTY = "bulkDirty";
const BULK_PLACEHOLDER = "bulkPlaceholder";
const BULK_MIXED = "bulkMixed";
const MIXED_LABEL = "Mixed";
const MIXED_SELECT_VALUE = "__mixed__";

type CommonValue<T> = {
    mixed: boolean;
    value: T | undefined;
};

function sameArray(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }
    return left.every((value, index) => value === right[index]);
}

function commonValue<T>(
    books: Book[],
    getter: (book: Book) => T,
    same: (left: T, right: T) => boolean = Object.is,
): CommonValue<T> {
    const FIRST_BOOK = books[0];
    if (FIRST_BOOK === undefined) {
        return { mixed: false, value: undefined };
    }
    const FIRST_VALUE = getter(FIRST_BOOK);
    for (const BOOK of books.slice(1)) {
        if (!same(FIRST_VALUE, getter(BOOK))) {
            return { mixed: true, value: undefined };
        }
    }
    return { mixed: false, value: FIRST_VALUE };
}

function originalPlaceholder(input: HTMLInputElement): string {
    const INPUT = input;
    if (INPUT.dataset[BULK_PLACEHOLDER] === undefined) {
        INPUT.dataset[BULK_PLACEHOLDER] = INPUT.placeholder;
    }
    return INPUT.dataset[BULK_PLACEHOLDER] ?? "";
}

function setMixedPlaceholder(
    input: HTMLInputElement,
    common: CommonValue<unknown>,
): void {
    const INPUT = input;
    INPUT.placeholder = originalPlaceholder(INPUT);
    if (common.mixed) {
        INPUT.placeholder = MIXED_LABEL;
    }
}

function clearDirty(element: HTMLElement): void {
    delete element.dataset[BULK_DIRTY];
}

function setInputCommon(
    input: HTMLInputElement,
    common: CommonValue<number | string | null>,
): void {
    const INPUT = input;
    setMixedPlaceholder(INPUT, common);
    INPUT.value = "";
    if (!common.mixed && common.value !== null && common.value !== undefined) {
        INPUT.value = String(common.value);
    }
    clearDirty(INPUT);
}

function mixedOption(): HTMLOptionElement {
    const OPTION = document.createElement("option");
    OPTION.value = MIXED_SELECT_VALUE;
    OPTION.textContent = MIXED_LABEL;
    return OPTION;
}

function removeMixedOption(select: HTMLSelectElement): void {
    for (const OPTION of Array.from(select.options)) {
        if (OPTION.value === MIXED_SELECT_VALUE) {
            OPTION.remove();
        }
    }
}

function setSelectCommon(
    select: HTMLSelectElement,
    common: CommonValue<string>,
): void {
    const SELECT = select;
    removeMixedOption(SELECT);
    if (common.mixed) {
        SELECT.prepend(mixedOption());
        SELECT.value = MIXED_SELECT_VALUE;
        clearDirty(SELECT);
        return;
    }
    SELECT.value = String(common.value ?? "");
    clearDirty(SELECT);
}

function setScheduledDaysCommon(refs: BookFormRefs, books: Book[]): void {
    const COMMON = commonValue(
        books,
        (book) => normalizeScheduledDays(book.scheduled_days),
        sameArray,
    );
    refs.scheduledDaysField.dataset[BULK_MIXED] = String(COMMON.mixed);
    if (COMMON.mixed) {
        fillScheduledDayControls(refs, []);
        clearDirty(refs.scheduledDaysField);
        return;
    }
    fillScheduledDayControls(refs, COMMON.value ?? []);
    clearDirty(refs.scheduledDaysField);
}

function blockedByLabel(bookId: string, allBooks: Book[]): string {
    const BOOK = allBooks.find((candidate) => {
        return String(candidate.book_id || "") === bookId;
    });
    if (BOOK === undefined) {
        return bookId;
    }
    return optionLabel(BOOK);
}

function setBlockedByCommon(
    refs: BookFormRefs,
    books: Book[],
    allBooks: Book[],
): void {
    const COMMON = commonValue(books, (book) => String(book.blocked_by ?? ""));
    const BLOCKED_BY_INPUT = refs.blockedByInput;
    const AFTER_BOOK_INPUT = refs.afterBookInput;
    BLOCKED_BY_INPUT.value = "";
    AFTER_BOOK_INPUT.value = "";
    setMixedPlaceholder(AFTER_BOOK_INPUT, COMMON);
    if (!COMMON.mixed && COMMON.value !== undefined && COMMON.value !== "") {
        BLOCKED_BY_INPUT.value = COMMON.value;
        AFTER_BOOK_INPUT.value = blockedByLabel(COMMON.value, allBooks);
    }
    clearDirty(AFTER_BOOK_INPUT);
    clearDirty(BLOCKED_BY_INPUT);
}

function setDateCommon(
    input: HTMLInputElement,
    common: CommonValue<string | null>,
): void {
    setOptionalDateInputValue(input, "");
    setInputCommon(input, common);
}

export function restoreBulkEditPlaceholders(refs: BookFormRefs): void {
    const INPUTS = [
        refs.deadlineInput,
        refs.finishedAtInput,
        refs.afterBookInput,
    ];
    for (const INPUT of INPUTS) {
        INPUT.placeholder = originalPlaceholder(INPUT);
    }
    refs.scheduledDaysField.dataset[BULK_MIXED] = "false";
    removeMixedOption(refs.statusSelectInput);
    removeMixedOption(refs.shelfSelectInput);
}

export function fillBulkEditForm(
    refs: BookFormRefs,
    books: Book[],
    allBooks: Book[],
): void {
    const TITLE_INPUT = refs.titleInput;
    const APPLY_DAYS_INPUT = refs.applyScheduledDaysToShelfInput;
    TITLE_INPUT.value = `${books.length} selected`;
    fillBulkTextFields(refs, books);
    fillBulkLengthFields(refs, books);
    fillBulkPlanningFields(refs, books);
    fillBulkDateFields(refs, books);
    setBlockedByCommon(refs, books, allBooks);
    setSelectCommon(
        refs.statusSelectInput,
        commonValue(books, (book) => book.status),
    );
    setSelectCommon(
        refs.shelfSelectInput,
        commonValue(books, (book) => book.shelf),
    );
    setScheduledDaysCommon(refs, books);
    APPLY_DAYS_INPUT.checked = false;
}

function fillBulkTextFields(refs: BookFormRefs, books: Book[]): void {
    setInputCommon(
        refs.author,
        commonValue(books, (book) => book.author),
    );
}

function fillBulkLengthFields(refs: BookFormRefs, books: Book[]): void {
    setInputCommon(
        refs.wordsInput,
        commonValue(books, (book) => book.words_total),
    );
    setInputCommon(
        refs.pagesTotalInput,
        commonValue(books, (book) => book.pages_total),
    );
    setInputCommon(
        refs.pagesReadInput,
        commonValue(books, (book) => book.pages_read),
    );
    setInputCommon(
        refs.progressInput,
        commonValue(books, (book) => book.progress_percent),
    );
}

function fillBulkPlanningFields(refs: BookFormRefs, books: Book[]): void {
    setInputCommon(
        refs.priorityInput,
        commonValue(books, (book) => book.priority),
    );
    setInputCommon(
        refs.difficultyInput,
        commonValue(books, (book) => book.difficulty),
    );
    setInputCommon(
        refs.maxMinutesInput,
        commonValue(books, (book) => book.max_minutes_per_day),
    );
}

function fillBulkDateFields(refs: BookFormRefs, books: Book[]): void {
    setDateCommon(
        refs.deadlineInput,
        commonValue(books, (book) => book.deadline),
    );
    setDateCommon(
        refs.finishedAtInput,
        commonValue(books, (book) => book.finished_at),
    );
}
