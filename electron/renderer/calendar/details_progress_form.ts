import type {
    Book,
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import {
    setInputValueFromBookProgress,
    submitProgressUpdate,
} from "./details_progress_form_helpers.ts";

type ProgressInputArgs = {
    placeholder: string;
    min: string;
    max: string | null;
    step: string;
};

type ProgressFormArgs = {
    row: CalendarRowWithFinish;
    book: Book;
    interactionHandlers: DetailInteractionHandlers;
    onProgressApplied: () => void;
};

type ProgressFormSubmitArgs = {
    row: CalendarRowWithFinish;
    form: HTMLFormElement;
    pagesInput: HTMLInputElement;
    pctInput: HTMLInputElement;
    interactionHandlers: DetailInteractionHandlers;
    onProgressApplied: () => void;
};

/**
 * Create and configure a numeric HTML input element for progress values.
 * @example
 * progressInput("Enter value", "0", "100", "1")
 * <input type="number" min="0" max="100" step="1" placeholder="Enter value">
 * @param args - Numeric input configuration.
 * @returns Configured numeric HTMLInputElement.
 **/
function progressInput(args: ProgressInputArgs): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.type = "number";
    INPUT_NODE.min = args.min;
    if (args.max !== null) {
        INPUT_NODE.max = args.max;
    }
    INPUT_NODE.step = args.step;
    INPUT_NODE.placeholder = args.placeholder;
    return INPUT_NODE;
}

function labeledProgressField(
    text: string,
    inputNode: HTMLInputElement,
): HTMLElement {
    const LABEL = document.createElement("label");
    LABEL.className = "day-progress-field";
    LABEL.textContent = text;
    LABEL.append(inputNode);
    return LABEL;
}

type ProgressInputs = {
    pagesInput: HTMLInputElement;
    pctInput: HTMLInputElement;
};

function createProgressForm(): HTMLFormElement {
    const PROGRESS_FORM = document.createElement("form");
    PROGRESS_FORM.className = "day-progress-form";
    return PROGRESS_FORM;
}

function progressSaveButton(): HTMLButtonElement {
    const SAVE_BTN = document.createElement("button");
    SAVE_BTN.type = "submit";
    SAVE_BTN.className = "btn";
    SAVE_BTN.textContent = "Update Progress";
    return SAVE_BTN;
}

function applyProgressSubmitResult(
    onProgressApplied: () => void,
    updatedValues: ReturnType<typeof submitProgressUpdate>,
): void {
    if (!updatedValues.applied) {
        return;
    }
    onProgressApplied();
}

function bindProgressFormSubmit(args: ProgressFormSubmitArgs): void {
    let initialPagesValue = String(args.pagesInput.value).trim();
    let initialPercentValue = String(args.pctInput.value).trim();
    const FORM = args.form;
    FORM.onsubmit = (event) => {
        const UPDATED_VALUES = submitProgressUpdate({
            event,
            initialPagesValue,
            initialPercentValue,
            interactionHandlers: args.interactionHandlers,
            pagesInput: args.pagesInput,
            pctInput: args.pctInput,
            row: args.row,
        });
        initialPagesValue = UPDATED_VALUES.initialPagesValue;
        initialPercentValue = UPDATED_VALUES.initialPercentValue;
        applyProgressSubmitResult(args.onProgressApplied, UPDATED_VALUES);
    };
}

function progressInputs(book: Book): ProgressInputs {
    const PAGES_INPUT = progressInput({
        max: null,
        min: "0",
        placeholder: "Pages read",
        step: "1",
    });
    setInputValueFromBookProgress(PAGES_INPUT, book.pages_read ?? undefined);
    const PCT_INPUT = progressInput({
        max: "100",
        min: "0",
        placeholder: "Percent complete",
        step: "0.1",
    });
    setInputValueFromBookProgress(PCT_INPUT, book.progress_percent);
    return { pagesInput: PAGES_INPUT, pctInput: PCT_INPUT };
}

function appendProgressFields(
    form: HTMLFormElement,
    inputs: ProgressInputs,
): void {
    form.append(
        labeledProgressField("Pages Read", inputs.pagesInput),
        labeledProgressField("Complete %", inputs.pctInput),
        progressSaveButton(),
    );
}

/**
 * Builds progress update form for today's session row.
 * @param args - Progress-form render inputs for today's session row.
 * @returns Progress form element.
 */
export function progressFormForToday(args: ProgressFormArgs): HTMLFormElement {
    const PROGRESS_FORM = createProgressForm();
    const INPUTS = progressInputs(args.book);
    appendProgressFields(PROGRESS_FORM, INPUTS);
    bindProgressFormSubmit({
        form: PROGRESS_FORM,
        interactionHandlers: args.interactionHandlers,
        onProgressApplied: args.onProgressApplied,
        pagesInput: INPUTS.pagesInput,
        pctInput: INPUTS.pctInput,
        row: args.row,
    });
    return PROGRESS_FORM;
}
