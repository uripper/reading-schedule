import {
    type BookSelectionControls,
    type BuildManualSessionAddPanelArgs,
    type SubmitManualAddFormArgs,
} from "../../types/types.js";
import {
    minuteValueForManualInput,
    sortedManualBooks,
} from "./details_manual_add_helpers.js";
import {
    initialPreferredBookId,
    refreshBookOptions,
} from "./details_manual_add_options.js";

const MANUAL_ADD_TITLE = "Manual add";
const TITLE_FILTER_LABEL = "Find title";
const BOOK_SELECT_LABEL = "Book";
const DAY_PROGRESS_FIELD_CLASS = "day-progress-field";

/**
 * Builds title-filter and book-select controls for manual session add.
 * @param books Sorted manual-session books available for selection.
 * @param defaultBookId Optional default selected book id.
 * @returns Book selection control nodes and select ref.
 */
function createBookSelectionControls(
    books: ReturnType<typeof sortedManualBooks>,
    defaultBookId: string | undefined,
): BookSelectionControls {
    const titleFilterLabel = document.createElement("label");
    titleFilterLabel.className = DAY_PROGRESS_FIELD_CLASS;
    titleFilterLabel.textContent = TITLE_FILTER_LABEL;

    const titleFilterInput = document.createElement("input");
    titleFilterInput.type = "search";
    titleFilterInput.autocomplete = "off";
    titleFilterInput.placeholder = "Type to narrow books";
    titleFilterLabel.append(titleFilterInput);

    const bookLabel = document.createElement("label");
    bookLabel.className = DAY_PROGRESS_FIELD_CLASS;
    bookLabel.textContent = BOOK_SELECT_LABEL;

    const bookSelect = document.createElement("select");
    bookSelect.required = true;
    const initialBookId = initialPreferredBookId(defaultBookId, books);
    refreshBookOptions(bookSelect, books, "", initialBookId);
    titleFilterInput.addEventListener("input", () => {
        const preferredBookId = String(bookSelect.value || "").trim();
        refreshBookOptions(
            bookSelect,
            books,
            titleFilterInput.value,
            preferredBookId,
        );
    });
    bookLabel.append(bookSelect);

    return { bookLabel, bookSelect, titleFilterLabel };
}

/**
 * Validates and submits manual-add form values through interaction handlers.
 * @param args Manual-add submission payload.
 */
function submitManualAddForm(args: SubmitManualAddFormArgs): void {
    const selectedBookId = String(args.bookSelect.value || "").trim();
    const parsedMinutes = Number(args.minutesInput.value || 0);
    if (
        selectedBookId === "" ||
        !Number.isFinite(parsedMinutes) ||
        parsedMinutes <= 0
    ) {
        return;
    }

    const added = args.interactionHandlers.onManualSessionAdded({
        bookId: selectedBookId,
        completed:
            args.mode !== "future" && Boolean(args.completeInput.checked),
        date: args.dateKey,
        minutes: parsedMinutes,
    });
    if (!added) {
        return;
    }
    args.rerenderDetails();
}

/**
 * Builds manual-session add UI panel for the selected day.
 * @param args Manual add panel dependencies.
 * @param args.dateKey Selected day key.
 * @param args.mode Day mode (past/today/future).
 * @param args.interactionHandlers Detail interaction callbacks.
 * @param args.rerenderDetails Callback to rerender details after successful add.
 * @param args.defaultBookId Default selected book id.
 * @param args.defaultMinutes Default minutes value.
 * @returns Panel element containing manual add form.
 */
export function buildManualSessionAddPanel(
    args: BuildManualSessionAddPanelArgs,
): HTMLElement {
    const rerenderDetails = (): void => {
        args.rerenderDetails();
    };
    const panel = document.createElement("section");
    panel.className = "day-manual-add";

    const title = document.createElement("h3");
    title.textContent = MANUAL_ADD_TITLE;
    panel.append(title);

    const books = sortedManualBooks(
        args.interactionHandlers.listSessionBooks(),
    );
    if (!books.length) {
        const hint = document.createElement("p");
        hint.className = "hint-text";
        hint.textContent =
            "Add a book first, then you can manually add calendar sessions.";
        panel.append(hint);
        return panel;
    }

    const form = document.createElement("form");
    form.className = "day-manual-add-form";

    const selectionControls = createBookSelectionControls(
        books,
        args.defaultBookId,
    );

    const minutesLabel = document.createElement("label");
    minutesLabel.className = DAY_PROGRESS_FIELD_CLASS;
    minutesLabel.textContent = "Minutes";

    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "1";
    minutesInput.step = "1";
    minutesInput.required = true;
    minutesInput.value = minuteValueForManualInput(args.defaultMinutes);
    minutesLabel.append(minutesInput);

    const completeLabel = document.createElement("label");
    completeLabel.className = "day-complete-toggle";
    const completeInput = document.createElement("input");
    completeInput.type = "checkbox";
    completeLabel.append(completeInput, " Mark complete");

    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.className = "btn";
    addButton.textContent = "Add Session";

    form.append(
        selectionControls.titleFilterLabel,
        selectionControls.bookLabel,
        minutesLabel,
    );
    if (args.mode !== "future") {
        form.append(completeLabel);
    }
    form.append(addButton);

    form.onsubmit = (event) => {
        event.preventDefault();
        submitManualAddForm({
            bookSelect: selectionControls.bookSelect,
            completeInput,
            dateKey: args.dateKey,
            interactionHandlers: args.interactionHandlers,
            minutesInput,
            mode: args.mode,
            rerenderDetails,
        });
    };

    panel.append(form);
    return panel;
}
