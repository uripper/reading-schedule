import type {
    BuildManualSessionAddPanelArgs,
    SubmitManualAddFormArgs,
} from "../../types/types.ts";
import { sortedManualBooks } from "./details_manual_add_helpers.ts";
import type { ManualAddFormElements } from "./details-manual-add-form.ts";
import { buildManualAddFormElements } from "./details-manual-add-form.ts";

const MANUAL_ADD_TITLE = "Manual add";
const MINIMUM_MANUAL_MINUTES = 0;
const EMPTY_TEXT = "";

interface ManualAddPayload {
    bookId: string;
    completed: boolean;
    date: string;
    minutes: number;
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
