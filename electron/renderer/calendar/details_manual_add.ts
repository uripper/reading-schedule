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

/**
 * Builds title-filter and book-select controls for manual session add.
 * @param books - Sorted manual-session books available for selection.
 * @param defaultBookId - Optional default selected book id.
 * @returns Book selection control nodes and select ref.
 */
function createBookSelectionControls(
    books: ReturnType<typeof sortedManualBooks>,
    defaultBookId: string | undefined,
): BookSelectionControls {
    const TITLE_LABEL_ELEMENT = document.createElement("label");
    TITLE_LABEL_ELEMENT.className = DAY_PROGRESS_FIELD_CLASS;
    TITLE_LABEL_ELEMENT.textContent = TITLE_FILTER_LABEL;

    const TITLE_FILTER_INPUT = document.createElement("input");
    TITLE_FILTER_INPUT.type = "search";
    TITLE_FILTER_INPUT.autocomplete = "off";
    TITLE_FILTER_INPUT.placeholder = "Type to narrow books";
    TITLE_LABEL_ELEMENT.append(TITLE_FILTER_INPUT);

    const BOOK_LABEL = document.createElement("label");
    BOOK_LABEL.className = DAY_PROGRESS_FIELD_CLASS;
    BOOK_LABEL.textContent = BOOK_SELECT_LABEL;

    const BOOK_SELECT = document.createElement("select");
    BOOK_SELECT.required = true;
    const INITIAL_BOOK_ID = initialPreferredBookId(defaultBookId, books);
    refreshBookOptions(BOOK_SELECT, books, "", INITIAL_BOOK_ID);
    TITLE_FILTER_INPUT.addEventListener("input", () => {
        const PREFERRED_BOOK_ID = String(BOOK_SELECT.value || "").trim();
        refreshBookOptions(
            BOOK_SELECT,
            books,
            TITLE_FILTER_INPUT.value,
            PREFERRED_BOOK_ID,
        );
    });
    BOOK_LABEL.append(BOOK_SELECT);

    return {
        bookLabel: BOOK_LABEL,
        bookSelect: BOOK_SELECT,
        titleFilterLabel: TITLE_LABEL_ELEMENT,
    };
}

/**
 * Validates and submits manual-add form values through interaction handlers.
 * @param args - Manual-add submission payload.
 */
function submitManualAddForm(args: SubmitManualAddFormArgs): void {
    const SELECTED_BOOK_ID = String(args.bookSelect.value || "").trim();
    const PARSED_MINUTES = Number(args.minutesInput.value || 0);
    if (
        SELECTED_BOOK_ID === "" ||
        !Number.isFinite(PARSED_MINUTES) ||
        PARSED_MINUTES <= 0
    ) {
        return;
    }

    const ADDED = args.interactionHandlers.onManualSessionAdded({
        bookId: SELECTED_BOOK_ID,
        completed:
            args.mode !== "future" && Boolean(args.completeInput.checked),
        date: args.dateKey,
        minutes: PARSED_MINUTES,
    });
    if (!ADDED) {
        return;
    }
    args.rerenderDetails();
}

interface ManualAddFormElements {
    bookSelect: HTMLSelectElement;
    completeInput: HTMLInputElement;
    form: HTMLFormElement;
    minutesInput: HTMLInputElement;
}

/**
 * Builds form elements for manual session add.
 * @param books - Sorted manual-session books for selection options.
 * @param defaultBookId - Optional default selected book id.
 * @param defaultMinutes - Optional default minutes value.
 * @param mode - Day mode (past/today/future).
 * @returns Form element refs and nodes for manual add controls.
 */
function buildManualAddFormElements(
    books: ReturnType<typeof sortedManualBooks>,
    defaultBookId: string | undefined,
    defaultMinutes: number,
    mode: string,
): ManualAddFormElements {
    const FORM = document.createElement("form");
    FORM.className = "day-manual-add-form";

    const SELECTION_CONTROLS = createBookSelectionControls(
        books,
        defaultBookId,
    );

    const MINUTES_LABEL = document.createElement("label");
    MINUTES_LABEL.className = DAY_PROGRESS_FIELD_CLASS;
    MINUTES_LABEL.textContent = "Minutes";

    const MINUTES_INPUT = document.createElement("input");
    MINUTES_INPUT.type = "number";
    MINUTES_INPUT.min = "1";
    MINUTES_INPUT.step = "1";
    MINUTES_INPUT.required = true;
    MINUTES_INPUT.value = minuteValueForManualInput(defaultMinutes);
    MINUTES_LABEL.append(MINUTES_INPUT);

    const COMPLETE_LABEL = document.createElement("label");
    COMPLETE_LABEL.className = "day-complete-toggle";
    const COMPLETE_INPUT = document.createElement("input");
    COMPLETE_INPUT.type = "checkbox";
    COMPLETE_LABEL.append(COMPLETE_INPUT, " Mark complete");

    const ADD_BUTTON = document.createElement("button");
    ADD_BUTTON.type = "submit";
    ADD_BUTTON.className = "btn";
    ADD_BUTTON.textContent = "Add Session";

    FORM.append(
        SELECTION_CONTROLS.titleFilterLabel,
        SELECTION_CONTROLS.bookLabel,
        MINUTES_LABEL,
    );
    if (mode !== "future") {
        FORM.append(COMPLETE_LABEL);
    }
    FORM.append(ADD_BUTTON);

    return {
        bookSelect: SELECTION_CONTROLS.bookSelect,
        completeInput: COMPLETE_INPUT,
        form: FORM,
        minutesInput: MINUTES_INPUT,
    };
}

/**
 * Builds manual-session add UI panel for the selected day.
 * @param args - Manual add panel dependencies.
 * @param dateKey - Selected day key.
 * @param mode - Day mode (past/today/future).
 * @param interactionHandlers - Detail interaction callbacks.
 * @param rerenderDetails - Callback to rerender details after successful add.
 * @param defaultBookId - Default selected book id.
 * @param defaultMinutes - Default minutes value.
 * @returns Panel element containing manual add form.
 */
export function buildManualSessionAddPanel(
    args: BuildManualSessionAddPanelArgs,
): HTMLElement {
    const PANEL = document.createElement("section");
    PANEL.className = "day-manual-add";

    const TITLE = document.createElement("h3");
    TITLE.textContent = MANUAL_ADD_TITLE;
    PANEL.append(TITLE);

    const BOOKS = sortedManualBooks(
        args.interactionHandlers.listSessionBooks(),
    );
    if (!BOOKS.length) {
        const HINT = document.createElement("p");
        HINT.className = "hint-text";
        HINT.textContent =
            "Add a book first, then you can manually add calendar sessions.";
        PANEL.append(HINT);
        return PANEL;
    }

    const FORM_ELEMENTS = buildManualAddFormElements(
        BOOKS,
        args.defaultBookId,
        args.defaultMinutes ?? 0,
        args.mode,
    );

    FORM_ELEMENTS.form.onsubmit = (event) => {
        event.preventDefault();
        submitManualAddForm({
            bookSelect: FORM_ELEMENTS.bookSelect,
            completeInput: FORM_ELEMENTS.completeInput,
            dateKey: args.dateKey,
            interactionHandlers: args.interactionHandlers,
            minutesInput: FORM_ELEMENTS.minutesInput,
            mode: args.mode,
            rerenderDetails: args.rerenderDetails,
        });
    };

    PANEL.append(FORM_ELEMENTS.form);
    return PANEL;
}
