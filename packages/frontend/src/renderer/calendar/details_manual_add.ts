import type { BuildManualSessionAddPanelArgs } from "../../types/types.ts";
import { openTodayAddBookOverlay } from "../app/today/today_add_book_overlay.ts";
import { bookCoverSrc } from "../books/model-normalize.ts";
import { sortedManualBooks } from "./details_manual_add_helpers.ts";

const MANUAL_ADD_TITLE = "Add Book";
const ADD_BOOK_BUTTON_TEXT = "Add Book";
const EMPTY_LIBRARY_TEXT = "Add a book first.";
const FULL_DAY_TEXT = "All books are already on this day.";
const FALLBACK_MINUTES = 10;
const EMPTY_TEXT = "";

function resolvedManualMinutes(defaultMinutes?: number): number {
    const PARSED = Number(defaultMinutes ?? 0);
    if (Number.isFinite(PARSED) && PARSED > 0) {
        return Math.max(1, Math.round(PARSED));
    }
    return FALLBACK_MINUTES;
}

function currentDayBookIds(args: BuildManualSessionAddPanelArgs): Set<string> {
    return new Set(args.existingBookIds ?? []);
}

function availableBooks(args: BuildManualSessionAddPanelArgs) {
    const DAY_BOOK_IDS = currentDayBookIds(args);
    return sortedManualBooks(args.interactionHandlers.listSessionBooks()).filter(
        (book) => {
            return !DAY_BOOK_IDS.has(book.bookId);
        },
    );
}

function overlayOptions(args: BuildManualSessionAddPanelArgs) {
    return availableBooks(args).map((book) => {
        const FULL_BOOK = args.interactionHandlers.getBookById(book.bookId);
        let coverSrc = EMPTY_TEXT;
        if (FULL_BOOK !== null) {
            coverSrc = bookCoverSrc(FULL_BOOK);
        }
        return {
            bookId: book.bookId,
            coverSrc,
            title: book.title,
        };
    });
}

function addBookToDay(args: BuildManualSessionAddPanelArgs, bookId: string): void {
    const ADDED = args.interactionHandlers.onManualSessionAdded({
        bookId,
        completed: false,
        date: args.dateKey,
        minutes: resolvedManualMinutes(args.defaultMinutes),
    });
    if (!ADDED) {
        return;
    }
    args.rerenderDetails();
}

function hintNode(message: string): HTMLParagraphElement {
    const HINT = document.createElement("p");
    HINT.className = "hint-text";
    HINT.textContent = message;
    return HINT;
}

function createManualAddPanel(): HTMLElement {
    const PANEL = document.createElement("section");
    PANEL.className = "day-manual-add";
    const TITLE = document.createElement("h3");
    TITLE.textContent = MANUAL_ADD_TITLE;
    PANEL.append(TITLE);
    return PANEL;
}

function addBookButton(args: BuildManualSessionAddPanelArgs): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn btn-primary";
    BUTTON.textContent = ADD_BOOK_BUTTON_TEXT;
    BUTTON.onclick = () => {
        const OPTIONS = overlayOptions(args);
        if (OPTIONS.length === 0) {
            return;
        }
        openTodayAddBookOverlay({
            onPick: (bookId) => {
                addBookToDay(args, bookId);
            },
            options: OPTIONS,
        });
    };
    return BUTTON;
}

export function buildManualSessionAddPanel(
    args: BuildManualSessionAddPanelArgs,
): HTMLElement {
    const PANEL = createManualAddPanel();
    const BOOKS = sortedManualBooks(args.interactionHandlers.listSessionBooks());
    if (BOOKS.length === 0) {
        PANEL.append(hintNode(EMPTY_LIBRARY_TEXT));
        return PANEL;
    }
    if (overlayOptions(args).length === 0) {
        PANEL.append(hintNode(FULL_DAY_TEXT));
        return PANEL;
    }
    PANEL.append(addBookButton(args));
    return PANEL;
}
