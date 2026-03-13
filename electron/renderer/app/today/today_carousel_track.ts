/**
 * Renders and binds Today carousel track navigation.
 */
import { el } from "../../dom.js";
import type { TodayCarouselModel } from "./today_carousel_model.js";
import { renderTrackState } from "./today_carousel_track_render.js";

const EMPTY_INDEX = -1;
const HOME_INDEX = 0;
const STEP_PREVIOUS = -1;
const STEP_NEXT = 1;

// TODO: Move shared Today carousel callback types into `electron/types` when
// the track/panel renderer boundary is finalized.
/**
 * Callback used when the carousel selects a different book.
 */
type SelectTodayBook = (bookId: string) => void;

/**
 * Wraps a carousel index while moving left or right through the book list.
 * @param index - Current selected index.
 * @param delta - Signed movement amount.
 * @param total - Total selectable books.
 * @returns Wrapped index inside the valid range.
 */
function wrappedIndex(index: number, delta: number, total: number): number {
    if (total <= 0) {
        return HOME_INDEX;
    }
    const NEXT_INDEX = index + delta;
    let wrapped = NEXT_INDEX % total;
    if (wrapped < 0) {
        wrapped += total;
    }
    return wrapped;
}

/**
 * Resolves the currently selected book index for navigation actions.
 * @param model - Current carousel model.
 * @returns Selected index or `0` when the selection is unavailable.
 */
function selectedIndex(model: TodayCarouselModel): number {
    const INDEX = model.books.findIndex((book) => {
        return book.bookId === model.selectedBookId;
    });
    if (INDEX === EMPTY_INDEX) {
        return HOME_INDEX;
    }
    return INDEX;
}

/**
 * Binds keyboard and previous/next navigation controls for the Today carousel.
 * @param model - Current carousel model.
 * @param selectBook - Selection callback for moving between books.
 */
export function bindCarouselNavigation(
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
): void {
    const PREV = el<HTMLButtonElement>("todayCarouselPrev");
    const NEXT = el<HTMLButtonElement>("todayCarouselNext");
    const TRACK = el<HTMLElement>("todayCarouselTrack");
    /**
    * Shift the selected book in the carousel by delta steps, wrapping around the book list.
    * @example
    * changeSelectedBook(1)
    * undefined
    * @param {{number}} {{delta}} - Number of positions to move the current selection (positive moves forward, negative moves backward).
    * @returns {{void}} No return value; updates the selected book in the shared model.
    **/
    const MOVE_SELECTION = (delta: number): void => {
        if (!model.books.length) {
            return;
        }
        const CURRENT_INDEX = selectedIndex(model);
        const NEXT_INDEX = wrappedIndex(
            CURRENT_INDEX,
            delta,
            model.books.length,
        );
        selectBook(model.books[NEXT_INDEX].bookId);
    };
    PREV.onclick = () => {
        MOVE_SELECTION(STEP_PREVIOUS);
    };
    NEXT.onclick = () => {
        MOVE_SELECTION(STEP_NEXT);
    };
    TRACK.onkeydown = (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            MOVE_SELECTION(STEP_PREVIOUS);
            return;
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            MOVE_SELECTION(STEP_NEXT);
            return;
        }
        if (event.key === "Home" && model.books.length) {
            event.preventDefault();
            selectBook(model.books[HOME_INDEX].bookId);
            return;
        }
        if (event.key === "End" && model.books.length) {
            event.preventDefault();
            selectBook(model.books[model.books.length - 1].bookId);
        }
    };
}

/**
 * Renders the Today carousel track contents and selected-book visuals.
 * @param model - Current carousel model.
 * @param selectBook - Selection callback for clicking carousel items.
 */
export function renderCarouselTrack(
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
): void {
    renderTrackState(model, selectBook);
}
