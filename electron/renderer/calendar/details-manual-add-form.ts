import type { BookSelectionControls } from "../../types/types.ts";
import type { sortedManualBooks } from "./details_manual_add_helpers.ts";
import { minuteValueForManualInput } from "./details_manual_add_helpers.ts";
import {
    initialPreferredBookId,
    refreshBookOptions,
} from "./details_manual_add_options.ts";

const TITLE_FILTER_LABEL = "Find title";
const BOOK_SELECT_LABEL = "Book";
const DAY_PROGRESS_FIELD_CLASS = "day-progress-field";
const MINUTES_LABEL_TEXT = "Minutes";
const COMPLETE_LABEL_TEXT = " Mark complete";
const ADD_BUTTON_TEXT = "Add Session";
const EMPTY_TEXT = "";

type ManualBooks = ReturnType<typeof sortedManualBooks>;

interface BuildManualAddFormElementsArgs {
    books: ManualBooks;
    defaultBookId: string | undefined;
    defaultMinutes: number;
    mode: string;
}

export interface ManualAddFormElements {
    bookSelect: HTMLSelectElement;
    completeInput: HTMLInputElement;
    form: HTMLFormElement;
    minutesInput: HTMLInputElement;
}

interface BookFilterControl {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

interface BookSelectControl {
    label: HTMLLabelElement;
    select: HTMLSelectElement;
}

interface MinutesField {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

interface CompleteToggle {
    input: HTMLInputElement;
    label: HTMLLabelElement;
}

interface ManualAddFormControls {
    addButton: HTMLButtonElement;
    completeToggle: CompleteToggle;
    minutesField: MinutesField;
    selectionControls: BookSelectionControls;
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
    bookSelect: HTMLSelectElement;
    books: ManualBooks;
    titleFilterInput: HTMLInputElement;
}): void {
    options.titleFilterInput.addEventListener("input", () => {
        const PREFERRED_BOOK_ID = String(
            options.bookSelect.value || EMPTY_TEXT,
        ).trim();
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
        bookSelect: SELECT_CONTROL.select,
        books,
        titleFilterInput: FILTER_CONTROL.input,
    });
    return {
        bookLabel: SELECT_CONTROL.label,
        bookSelect: SELECT_CONTROL.select,
        titleFilterLabel: FILTER_CONTROL.label,
    };
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

function manualAddFormControls(
    args: BuildManualAddFormElementsArgs,
): ManualAddFormControls {
    return {
        addButton: createManualAddButton(),
        completeToggle: createCompleteToggle(),
        minutesField: createMinutesField(args.defaultMinutes),
        selectionControls: createBookSelectionControls(
            args.books,
            args.defaultBookId,
        ),
    };
}

function appendManualAddFields(options: {
    controls: ManualAddFormControls;
    form: HTMLFormElement;
    mode: string;
}): void {
    options.form.append(
        options.controls.selectionControls.titleFilterLabel,
        options.controls.selectionControls.bookLabel,
        options.controls.minutesField.label,
    );
    if (options.mode !== "future") {
        options.form.append(options.controls.completeToggle.label);
    }
    options.form.append(options.controls.addButton);
}

function manualAddFormElements(
    controls: ManualAddFormControls,
    form: HTMLFormElement,
): ManualAddFormElements {
    return {
        bookSelect: controls.selectionControls.bookSelect,
        completeInput: controls.completeToggle.input,
        form,
        minutesInput: controls.minutesField.input,
    };
}

export function buildManualAddFormElements(
    args: BuildManualAddFormElementsArgs,
): ManualAddFormElements {
    const FORM = document.createElement("form");
    FORM.className = "day-manual-add-form";
    const CONTROLS = manualAddFormControls(args);
    appendManualAddFields({
        controls: CONTROLS,
        form: FORM,
        mode: args.mode,
    });
    return manualAddFormElements(CONTROLS, FORM);
}
