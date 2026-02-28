import {
    type Book,
    type CalendarRowWithFinish,
    type DetailInteractionHandlers,
} from "../../types/types.js";
import {
    setInputValueFromBookProgress,
    submitProgressUpdate,
} from "./details_progress_form_helpers.js";

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

    const PAGES_INPUT = document.createElement("input");
    PAGES_INPUT.type = "number";
    PAGES_INPUT.min = "0";
    PAGES_INPUT.step = "1";
    PAGES_INPUT.placeholder = "Pages read";
    setInputValueFromBookProgress(PAGES_INPUT, book.pages_read ?? undefined);

    const PCT_INPUT = document.createElement("input");
    PCT_INPUT.type = "number";
    PCT_INPUT.min = "0";
    PCT_INPUT.max = "100";
    PCT_INPUT.step = "0.1";
    PCT_INPUT.placeholder = "Percent complete";
    setInputValueFromBookProgress(PCT_INPUT, book.progress_percent);

    const PAGES_LABEL = document.createElement("label");
    PAGES_LABEL.className = "day-progress-field";
    PAGES_LABEL.textContent = "Pages Read";
    PAGES_LABEL.append(PAGES_INPUT);

    const PERCENT_LABEL = document.createElement("label");
    PERCENT_LABEL.className = "day-progress-field";
    PERCENT_LABEL.textContent = "Complete %";
    PERCENT_LABEL.append(PCT_INPUT);

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
