/**
 * Renders and binds Today carousel track navigation.
 */
import { el } from "../../dom.ts";
import type { TodayCarouselModel } from "./today_carousel_model.ts";
import { renderTrackState } from "./today_carousel_track_render.ts";

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

type TrackNavigationActions = {
    selectPrevious(): void;
    selectNext(): void;
};

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

function moveSelection(
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
    delta: number,
): void {
    if (!model.books.length) {
        return;
    }
    const CURRENT_INDEX = selectedIndex(model);
    const NEXT_INDEX = wrappedIndex(CURRENT_INDEX, delta, model.books.length);
    selectBook(model.books[NEXT_INDEX].bookId);
}

function selectEdgeBook(
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
    index: number,
): boolean {
    if (!model.books.length) {
        return false;
    }
    selectBook(model.books[index].bookId);
    return true;
}

function handleArrowKey(
    event: KeyboardEvent,
    actions: TrackNavigationActions,
): boolean {
    if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.selectPrevious();
        return true;
    }
    if (event.key === "ArrowRight") {
        event.preventDefault();
        actions.selectNext();
        return true;
    }
    return false;
}

function handleEdgeKey(
    event: KeyboardEvent,
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
): boolean {
    if (event.key === "Home") {
        event.preventDefault();
        return selectEdgeBook(model, selectBook, HOME_INDEX);
    }
    if (event.key === "End") {
        event.preventDefault();
        return selectEdgeBook(model, selectBook, model.books.length - 1);
    }
    return false;
}

function bindTrackKeydown(args: {
    track: HTMLElement;
    model: TodayCarouselModel;
    selectBook: SelectTodayBook;
    actions: TrackNavigationActions;
}): void {
    const TRACK = args.track;
    TRACK.onkeydown = (event) => {
        if (handleArrowKey(event, args.actions)) {
            return;
        }
        handleEdgeKey(event, args.model, args.selectBook);
    };
}

function bindTrackButtons(args: {
    previousButton: HTMLButtonElement;
    nextButton: HTMLButtonElement;
    actions: TrackNavigationActions;
}): void {
    const PREVIOUS_BUTTON = args.previousButton;
    const NEXT_BUTTON = args.nextButton;
    PREVIOUS_BUTTON.onclick = args.actions.selectPrevious;
    NEXT_BUTTON.onclick = args.actions.selectNext;
}

function carouselNavigationActions(
    model: TodayCarouselModel,
    selectBook: SelectTodayBook,
): TrackNavigationActions {
    return {
        selectNext: (): void => {
            moveSelection(model, selectBook, STEP_NEXT);
        },
        selectPrevious: (): void => {
            moveSelection(model, selectBook, STEP_PREVIOUS);
        },
    };
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
    const ACTIONS = carouselNavigationActions(model, selectBook);
    bindTrackButtons({
        actions: ACTIONS,
        nextButton: NEXT,
        previousButton: PREV,
    });
    bindTrackKeydown({
        actions: ACTIONS,
        model,
        selectBook,
        track: TRACK,
    });
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
