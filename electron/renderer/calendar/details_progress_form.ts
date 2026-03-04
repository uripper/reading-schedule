import type {
    Book,
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.js";
import {
    setInputValueFromBookProgress,
    submitProgressUpdate,
} from "./details_progress_form_helpers.js";

function progressInput(
    placeholder: string,
    min: string,
    max: string | null,
    step: string,
): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.type = "number";
    INPUT_NODE.min = min;
    if (max !== null) {
        INPUT_NODE.max = max;
    }
    INPUT_NODE.step = step;
    INPUT_NODE.placeholder = placeholder;
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

/**
 * Builds progress update form for today's session row.
 * @param row Calendar row being edited.
 * @param book Current book model for defaults.
 * @param interactionHandlers Detail interaction handlers.
 * @param onProgressApplied Callback fired after successful apply.
 * @returns Progress form element.
 */
export function progressFormForToday(
    row: CalendarRowWithFinish,
    book: Book,
    interactionHandlers: DetailInteractionHandlers,
    onProgressApplied: () => void,
): HTMLFormElement {
    const PROGRESS_FORM = document.createElement("form");
    PROGRESS_FORM.className = "day-progress-form";

    const PAGES_INPUT = progressInput("Pages read", "0", null, "1");
    setInputValueFromBookProgress(PAGES_INPUT, book.pages_read ?? undefined);

    const PCT_INPUT = progressInput("Percent complete", "0", "100", "0.1");
    setInputValueFromBookProgress(PCT_INPUT, book.progress_percent);

    const PAGES_LABEL = labeledProgressField("Pages Read", PAGES_INPUT);
    const PERCENT_LABEL = labeledProgressField("Complete %", PCT_INPUT);

    let initialPagesValue = String(PAGES_INPUT.value).trim();
    let initialPercentValue = String(PCT_INPUT.value).trim();

    const SAVE_BTN = document.createElement("button");
    SAVE_BTN.type = "submit";
    SAVE_BTN.className = "btn";
    SAVE_BTN.textContent = "Update Progress";

    PROGRESS_FORM.append(PAGES_LABEL, PERCENT_LABEL, SAVE_BTN);
    PROGRESS_FORM.onsubmit = (event) => {
        const UPDATED_VALUES = submitProgressUpdate({
            event,
            initialPagesValue,
            initialPercentValue,
            interactionHandlers,
            pagesInput: PAGES_INPUT,
            pctInput: PCT_INPUT,
            row,
        });
        initialPagesValue = UPDATED_VALUES.initialPagesValue;
        initialPercentValue = UPDATED_VALUES.initialPercentValue;
        if (UPDATED_VALUES.applied) {
            onProgressApplied();
        }
    };

    return PROGRESS_FORM;
}
