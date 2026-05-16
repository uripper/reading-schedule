/**
 * Renders the Today carousel track DOM and selected-book presentation.
 */
import { el } from "../../dom.ts";
import type {
    TodayCarouselBookItem,
    TodayCarouselModel,
} from "./today_carousel_model.ts";

const MIN_VISIBLE_OFFSET = -2;
const MAX_VISIBLE_OFFSET = 2;
const ADD_BOOK_ITEM_ID = "__today-add-book__";
const ADD_BOOK_LABEL = "Add book to Today";
const ADD_BOOK_SYMBOL = "+";
const ADD_CARD_BACKGROUND = "#f7e474";
const ADD_CARD_BORDER = "2px solid #000";
const ADD_CARD_SHADOW = "10px 10px 0 #000";
const ADD_CARD_TEXT_SIZE = "clamp(3rem, 5vw, 4.5rem)";
const ADD_CARD_TEXT_WEIGHT = "900";

type TodayCarouselTrackBook = TodayCarouselModel["books"][number];

/**
 * Builds fallback artwork text when a book has no cover image.
 * @param title - Book title.
 * @returns Single-letter fallback label.
 */
function fallbackText(title: string): string {
    const NORMALIZED_TITLE = title.trim();
    if (NORMALIZED_TITLE === "") {
        return "?";
    }
    return NORMALIZED_TITLE.slice(0, 1).toUpperCase();
}

/**
 * Scrolls the carousel track so the selected book is centered when possible.
 * @param track - Carousel track element.
 * @param bookId - Selected book id.
 */
function centerBookInTrack(track: HTMLElement, bookId: string): void {
    if (bookId === "") {
        return;
    }
    const NODE = track.querySelector<HTMLElement>(`[data-book-id="${bookId}"]`);
    if (!(NODE instanceof HTMLElement)) {
        return;
    }
    const TRACK_RECT = track.getBoundingClientRect();
    const NODE_RECT = NODE.getBoundingClientRect();
    const NODE_CENTER =
        NODE_RECT.left -
        TRACK_RECT.left +
        track.scrollLeft +
        NODE_RECT.width / 2;
    const TARGET_LEFT = Math.max(0, NODE_CENTER - TRACK_RECT.width / 2);
    const TRACK_ELEMENT = track;
    TRACK_ELEMENT.scrollLeft = Math.round(TARGET_LEFT);
}

/**
 * Returns button items currently rendered in the carousel track.
 * @param track - Carousel track element.
 * @returns Track item buttons in DOM order.
 */
function carouselItems(track: HTMLElement): HTMLButtonElement[] {
    return Array.from(track.children).filter(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
    );
}

/**
 * Checks whether the existing track DOM already matches the model order.
 * @param items - Rendered button items.
 * @param books - Current carousel book list.
 * @returns `true` when DOM order already matches model order.
 */
function hasSameTrackOrder(
    items: HTMLButtonElement[],
    expectedIds: string[],
): boolean {
    if (items.length !== expectedIds.length) {
        return false;
    }
    return expectedIds.every((bookId, index) => {
        return items[index]?.dataset.bookId === bookId;
    });
}

function buildAddBookItem(onAddBook: () => void): HTMLButtonElement {
    const ITEM = document.createElement("button");
    ITEM.type = "button";
    ITEM.className = "today-carousel-item is-add-book";
    ITEM.dataset.bookId = ADD_BOOK_ITEM_ID;
    ITEM.setAttribute("role", "option");
    ITEM.setAttribute("aria-label", ADD_BOOK_LABEL);
    ITEM.onclick = () => {
        onAddBook();
    };

    const SYMBOL = document.createElement("span");
    SYMBOL.className = "today-carousel-fallback";
    SYMBOL.textContent = ADD_BOOK_SYMBOL;
    SYMBOL.style.fontSize = ADD_CARD_TEXT_SIZE;
    SYMBOL.style.fontWeight = ADD_CARD_TEXT_WEIGHT;
    SYMBOL.style.background = ADD_CARD_BACKGROUND;
    SYMBOL.style.color = "#000";

    ITEM.style.background = ADD_CARD_BACKGROUND;
    ITEM.style.border = ADD_CARD_BORDER;
    ITEM.style.boxShadow = ADD_CARD_SHADOW;
    ITEM.append(SYMBOL);
    return ITEM;
}

function expectedTrackIds(
    books: TodayCarouselTrackBook[],
    onAddBook?: () => void,
): string[] {
    const IDS = books.map((book) => {
        return book.bookId;
    });
    if (onAddBook !== undefined) {
        IDS.push(ADD_BOOK_ITEM_ID);
    }
    return IDS;
}

/**
 * Builds a single clickable carousel item for a book.
 * @param book - Book model shown in the carousel.
 * @param selectBook - Selection callback for the item.
 * @returns Button element for the carousel track.
 */
function buildCarouselItem(
    book: TodayCarouselTrackBook,
    selectBook: (bookId: string) => void,
): HTMLButtonElement {
    const ITEM = document.createElement("button");
    setCarouselItems(ITEM, book, selectBook);

    if (book.coverSrc !== "") {
        const IMG = document.createElement("img");
        IMG.src = book.coverSrc;
        IMG.alt = `Cover of ${book.title}`;
        IMG.loading = "lazy";
        ITEM.append(IMG);
        return ITEM;
    }
    const FALLBACK = document.createElement("span");
    FALLBACK.className = "today-carousel-fallback";
    FALLBACK.textContent = fallbackText(book.title);
    ITEM.append(FALLBACK);
    return ITEM;
}

function setCarouselItems(
    item: HTMLButtonElement,
    book: TodayCarouselBookItem,
    selectBook: (bookId: string) => void,
) {
    const ITEM = item;
    ITEM.type = "button";
    ITEM.className = "today-carousel-item";
    ITEM.dataset.bookId = book.bookId;
    ITEM.setAttribute("role", "option");
    ITEM.setAttribute("aria-label", `${book.title} by ${book.author}`);
    ITEM.onclick = () => {
        selectBook(book.bookId);
    };
}

/**
 * Reconciles carousel item DOM with the current book order.
 * @param track - Carousel track element.
 * @param books - Current carousel book list.
 * @param selectBook - Selection callback for items.
 */
function renderTrackItems(options: {
    onAddBook?: () => void;
    selectBook: (bookId: string) => void;
    books: TodayCarouselTrackBook[];
    track: HTMLElement;
}): void {
    const ITEMS = carouselItems(options.track);
    const EXPECTED_IDS = expectedTrackIds(options.books, options.onAddBook);
    if (hasSameTrackOrder(ITEMS, EXPECTED_IDS)) {
        return;
    }
    const NODES = options.books.map((book) => {
        return buildCarouselItem(book, options.selectBook);
    });
    if (options.onAddBook !== undefined) {
        NODES.push(buildAddBookItem(options.onAddBook));
    }
    options.track.replaceChildren(...NODES);
}

/**
 * Applies selected and offset styling metadata to rendered track items.
 * @param track - Carousel track element.
 * @param selectedBookId - Selected book id.
 * @param selectedIndexValue - Selected index within the model.
 */
function applySelectedItemState(
    track: HTMLElement,
    selectedBookId: string,
    selectedIndexValue: number,
): void {
    for (const [INDEX, ITEM] of Array.from(track.children).entries()) {
        if (!(ITEM instanceof HTMLButtonElement)) {
            continue;
        }

        const IS_SELECTED = ITEM.dataset.bookId === selectedBookId;
        const OFFSET = INDEX - selectedIndexValue;
        const CLAMPED_OFFSET = Math.max(
            MIN_VISIBLE_OFFSET,
            Math.min(MAX_VISIBLE_OFFSET, OFFSET),
        );

        ITEM.classList.toggle("is-selected", IS_SELECTED);
        ITEM.setAttribute("aria-selected", String(IS_SELECTED));
        ITEM.dataset.offset = String(CLAMPED_OFFSET);
    }
}

/**
 * Renders the Today carousel track contents and selected-book visuals.
 * @param model - Current carousel model.
 * @param selectBook - Selection callback for clicking carousel items.
 */
export function renderTrackState(
    model: TodayCarouselModel,
    selectBook: (bookId: string) => void,
    onAddBook?: () => void,
): void {
    const TRACK = el<HTMLElement>("todayCarouselTrack");
    renderTrackItems({
        books: model.books,
        onAddBook,
        selectBook,
        track: TRACK,
    });

    const SELECTED_INDEX = model.books.findIndex((book) => {
        return book.bookId === model.selectedBookId;
    });
    applySelectedItemState(TRACK, model.selectedBookId, SELECTED_INDEX);

    requestAnimationFrame(() => {
        centerBookInTrack(TRACK, model.selectedBookId);
    });
}
