import type {
  DayMode,
  DetailInteractionHandlers,
} from "./details_types.js";
import {
  minuteValueForManualInput,
  sortedManualBooks,
} from "./details_manual_add_helpers.js";

const MANUAL_ADD_TITLE = "Manual add";

interface BuildManualSessionAddPanelArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  defaultBookId?: string;
  defaultMinutes?: number;
}

interface SubmitManualAddFormArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  bookSelect: HTMLSelectElement;
  minutesInput: HTMLInputElement;
  completeInput: HTMLInputElement;
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
    date: args.dateKey,
    bookId: selectedBookId,
    minutes: parsedMinutes,
    completed: args.mode !== "future" && Boolean(args.completeInput.checked),
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

  const books = sortedManualBooks(args.interactionHandlers.listSessionBooks());
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

  const bookLabel = document.createElement("label");
  bookLabel.className = "day-progress-field";
  bookLabel.textContent = "Book";

  const bookSelect = document.createElement("select");
  bookSelect.required = true;
  books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.bookId;
    option.textContent = book.title;
    bookSelect.append(option);
  });
  if (
    args.defaultBookId !== undefined &&
    args.defaultBookId !== "" &&
    books.some((book) => book.bookId === args.defaultBookId)
  ) {
    bookSelect.value = args.defaultBookId;
  }
  bookLabel.append(bookSelect);

  const minutesLabel = document.createElement("label");
  minutesLabel.className = "day-progress-field";
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

  form.append(bookLabel, minutesLabel);
  if (args.mode !== "future") {
    form.append(completeLabel);
  }
  form.append(addButton);

  form.onsubmit = (event) => {
    event.preventDefault();
    submitManualAddForm({
      dateKey: args.dateKey,
      mode: args.mode,
      interactionHandlers: args.interactionHandlers,
      rerenderDetails,
      bookSelect,
      minutesInput,
      completeInput,
    });
  };

  panel.append(form);
  return panel;
}
