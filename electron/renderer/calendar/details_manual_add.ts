import type {
    BookSelectionControls,
    BuildManualSessionAddPanelArgs,
    SubmitManualAddFormArgs,
} from "../../types/types.ts";
import {
    minuteValueForManualInput,
    sortedManualBooks,
} from "./details_manual_add_helpers.ts";
import {
    initialPreferredBookId,
    refreshBookOptions,
} from "./details_manual_add_options.ts";

const MANUAL_ADD_TITLE = "Manual add";
const TITLE_FILTER_LABEL = "Find title";
const BOOK_SELECT_LABEL = "Book";
const DAY_PROGRESS_FIELD_CLASS = "day-progress-field";
const MINUTES_LABEL_TEXT = "Minutes";
const COMPLETE_LABEL_TEXT = " Mark complete";
const ADD_BUTTON_TEXT = "Add Session";
const EMPTY_TEXT = "";
const MINIMUM_MANUAL_MINUTES = 0;

type ManualBooks = ReturnType<typeof sortedManualBooks>;

interface BookFilterControl {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

interface BookSelectControl {
    label: HTMLLabelElement;
    select: HTMLSelectElement;
}

interface BuildManualAddFormElementsArgs {
    books: ManualBooks;
    defaultBookId: string | undefined;
    defaultMinutes: number;
    mode: string;
}

interface ManualAddFormElements {
    bookSelect: HTMLSelectElement;
    completeInput: HTMLInputElement;
    form: HTMLFormElement;
    minutesInput: HTMLInputElement;
}

interface ManualAddPayload {
    bookId: string;
    completed: boolean;
    date: string;
    minutes: number;
}

interface MinutesField {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

interface CompleteToggle {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

function createTitleFilterControl(): BookFilterControl {
    const LABEL = document.createElement("label");
    LABEL.className = DAY_PROGRESS_FIELD_CLASS;
    LABEL.textContent = TITLE_FILTER_LABEL;

    const INPUT = document.createElement("input");
    INPUT.type = "search";
    INPUT.autocomplete = "off";
    INPUT.placeholder = "Type to narrow books";
    LABEL.append(INPUT);
    return { input: INPUT, label: LABEL };
}

function createBookSelectControl(
    books: ManualBooks,
    defaultBookId: string | undefined,
): BookSelectControl {
    const LABEL = document.createElement("label");
    LABEL.className = DAY_PROGRESS_FIELD_CLASS;
    LABEL.textContent = BOOK_SELECT_LABEL;

    const SELECT = document.createElement("select");
    SELECT.required = true;
    const INITIAL_BOOK_ID = initialPreferredBookId(defaultBookId, books);
    refreshBookOptions(SELECT, books, EMPTY_TEXT, INITIAL_BOOK_ID);
    LABEL.append(SELECT);
    return { label: LABEL, select: SELECT };
}

function bindBookTitleFilter(options: {
    books: ManualBooks;
    bookSelect: HTMLSelectElement;
    titleFilterInput: HTMLInputElement;
}): void {
    options.titleFilterInput.addEventListener("input", () => {
        const PREFERRED_BOOK_ID = String(options.bookSelect.value || EMPTY_TEXT).trim();
        refreshBookOptions(
            options.bookSelect,
            options.books,
            options.titleFilterInput.value,
            PREFERRED_BOOK_ID,
        );
    });
}

function createBookSelectionControls(
    books: ManualBooks,
    defaultBookId: string | undefined,
): BookSelectionControls {
    const FILTER_CONTROL = createTitleFilterControl();
    const SELECT_CONTROL = createBookSelectControl(books, defaultBookId);
    bindBookTitleFilter({
        books,
        bookSelect: SELECT_CONTROL.select,
        titleFilterInput: FILTER_CONTROL.input,
    });
    return {
        bookLabel: SELECT_CONTROL.label,
        bookSelect: SELECT_CONTROL.select,
        titleFilterLabel: FILTER_CONTROL.label,
    };
}

function parsedManualMinutes(minutesInput: HTMLInputElement): number | null {
    const PARSED_MINUTES = Number(minutesInput.value || MINIMUM_MANUAL_MINUTES);
    if (
        !Number.isFinite(PARSED_MINUTES) ||
        PARSED_MINUTES <= MINIMUM_MANUAL_MINUTES
    ) {
        return null;
    }
    return PARSED_MINUTES;
}

function manualAddCompletedState(
    mode: string,
    completeInput: HTMLInputElement,
): boolean {
    if (mode === "future") {
        return false;
    }
    return Boolean(completeInput.checked);
}

function manualAddPayload(
    args: SubmitManualAddFormArgs,
): ManualAddPayload | null {
    const SELECTED_BOOK_ID = String(args.bookSelect.value || EMPTY_TEXT).trim();
    const PARSED_MINUTES = parsedManualMinutes(args.minutesInput);
    if (SELECTED_BOOK_ID === EMPTY_TEXT || PARSED_MINUTES === null) {
        return null;
    }
    return {
        bookId: SELECTED_BOOK_ID,
        completed: manualAddCompletedState(args.mode, args.completeInput),
        date: args.dateKey,
        minutes: PARSED_MINUTES,
    };
}

function submitManualAddForm(args: SubmitManualAddFormArgs): void {
    const PAYLOAD = manualAddPayload(args);
    if (PAYLOAD === null) {
        return;
    }
    const ADDED = args.interactionHandlers.onManualSessionAdded(PAYLOAD);
    if (!ADDED) {
        return;
    }
    args.rerenderDetails();
}

function createMinutesField(defaultMinutes: number): MinutesField {
    const LABEL = document.createElement("label");
    LABEL.className = DAY_PROGRESS_FIELD_CLASS;
    LABEL.textContent = MINUTES_LABEL_TEXT;

    const INPUT = document.createElement("input");
    INPUT.type = "number";
    INPUT.min = "1";
    INPUT.step = "1";
    INPUT.required = true;
    INPUT.value = minuteValueForManualInput(defaultMinutes);
    LABEL.append(INPUT);
    return { input: INPUT, label: LABEL };
}

function createCompleteToggle(): CompleteToggle {
    const LABEL = document.createElement("label");
    LABEL.className = "day-complete-toggle";
    const INPUT = document.createElement("input");
    INPUT.type = "checkbox";
    LABEL.append(INPUT, COMPLETE_LABEL_TEXT);
    return { input: INPUT, label: LABEL };
}

function createManualAddButton(): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "submit";
    BUTTON.className = "btn";
    BUTTON.textContent = ADD_BUTTON_TEXT;
    return BUTTON;
}

function appendManualAddFields(options: {
    addButton: HTMLButtonElement;
    completeLabel: HTMLLabelElement;
    form: HTMLFormElement;
    mode: string;
    minutesLabel: HTMLLabelElement;
    selectionControls: BookSelectionControls;
}): void {
    options.form.append(
        options.selectionControls.titleFilterLabel,
        options.selectionControls.bookLabel,
        options.minutesLabel,
    );
    if (options.mode !== "future") {
        options.form.append(options.completeLabel);
    }
    options.form.append(options.addButton);
}

function buildManualAddFormElements(
    args: BuildManualAddFormElementsArgs,
): ManualAddFormElements {
    const FORM = document.createElement("form");
    FORM.className = "day-manual-add-form";
    const SELECTION_CONTROLS = createBookSelectionControls(
        args.books,
        args.defaultBookId,
    );
    const MINUTES_FIELD = createMinutesField(args.defaultMinutes);
    const COMPLETE_TOGGLE = createCompleteToggle();
    appendManualAddFields({
        addButton: createManualAddButton(),
        completeLabel: COMPLETE_TOGGLE.label,
        form: FORM,
        mode: args.mode,
        minutesLabel: MINUTES_FIELD.label,
        selectionControls: SELECTION_CONTROLS,
    });
    return {
        bookSelect: SELECTION_CONTROLS.bookSelect,
        completeInput: COMPLETE_TOGGLE.input,
        form: FORM,
        minutesInput: MINUTES_FIELD.input,
    };
}

function noManualBooksHint(): HTMLParagraphElement {
    const HINT = document.createElement("p");
    HINT.className = "hint-text";
    HINT.textContent =
        "Add a book first, then you can manually add calendar sessions.";
    return HINT;
}

function bindManualAddSubmit(options: {
    args: BuildManualSessionAddPanelArgs;
    formElements: ManualAddFormElements;
}): void {
    options.formElements.form.onsubmit = (event) => {
        event.preventDefault();
        submitManualAddForm({
            bookSelect: options.formElements.bookSelect,
            completeInput: options.formElements.completeInput,
            dateKey: options.args.dateKey,
            interactionHandlers: options.args.interactionHandlers,
            minutesInput: options.formElements.minutesInput,
            mode: options.args.mode,
            rerenderDetails: options.args.rerenderDetails,
        });
    };
}

function createManualAddPanel(): HTMLElement {
    const PANEL = document.createElement("section");
    PANEL.className = "day-manual-add";
    const TITLE = document.createElement("h3");
    TITLE.textContent = MANUAL_ADD_TITLE;
    PANEL.append(TITLE);
    return PANEL;
}

export function buildManualSessionAddPanel(
    args: BuildManualSessionAddPanelArgs,
): HTMLElement {
    const PANEL = createManualAddPanel();
    const BOOKS = sortedManualBooks(
        args.interactionHandlers.listSessionBooks(),
    );
    if (BOOKS.length === 0) {
        PANEL.append(noManualBooksHint());
        return PANEL;
    }
    const FORM_ELEMENTS = buildManualAddFormElements({
        books: BOOKS,
        defaultBookId: args.defaultBookId,
        defaultMinutes: args.defaultMinutes ?? MINIMUM_MANUAL_MINUTES,
        mode: args.mode,
    });
    bindManualAddSubmit({ args, formElements: FORM_ELEMENTS });
    PANEL.append(FORM_ELEMENTS.form);
    return PANEL;
}
