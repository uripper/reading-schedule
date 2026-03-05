import type {
    BookLookupItem,
    HandleLookupKeydownArgs,
    SelectItem,
    SetActiveIndex,
} from "../../types/types.js";

/**
 * Moves highlight to the next search result when ArrowDown is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param setActiveIndex - Callback used to update highlighted result index.
 */
function handleArrowDown(
    event: KeyboardEvent,
    currentItems: readonly BookLookupItem[],
    activeIndex: number,
    setActiveIndex: SetActiveIndex,
): void {
    event.preventDefault();
    if (!currentItems.length) {
        return;
    }
    if (activeIndex < 0) {
        setActiveIndex(0);
        return;
    }
    setActiveIndex(activeIndex + 1);
}

/**
 * Moves highlight to the previous search result when ArrowUp is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param setActiveIndex - Callback used to update highlighted result index.
 */
function handleArrowUp(
    event: KeyboardEvent,
    currentItems: readonly BookLookupItem[],
    activeIndex: number,
    setActiveIndex: SetActiveIndex,
): void {
    event.preventDefault();
    if (!currentItems.length) {
        return;
    }
    if (activeIndex < 0) {
        setActiveIndex(currentItems.length - 1);
        return;
    }
    setActiveIndex(activeIndex - 1);
}

/**
 * Selects the currently highlighted lookup result when Enter is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param selectItem - Callback used to commit the selected item.
 */
function handleEnter(
    event: KeyboardEvent,
    currentItems: readonly BookLookupItem[],
    activeIndex: number,
    selectItem: SelectItem,
): void {
    if (activeIndex < 0 || !currentItems.length) {
        return;
    }
    event.preventDefault();
    selectItem(activeIndex);
}

/**
 * Clears lookup results and removes focus from the search field.
 * @param clearResults - Callback that empties the current result list.
 * @param searchInput - Lookup search input element.
 */
function handleEscape(
    clearResults: () => void,
    searchInput: HTMLInputElement,
): void {
    clearResults();
    searchInput.blur();
}

/**
 * Routes lookup keyboard events to navigation and selection handlers.
 * @param args - Lookup keyboard event payload and state callbacks.
 * @param args.event - Keyboard event from the lookup input.
 * @param args.currentItems - Current result list shown in the lookup menu.
 * @param args.activeIndex - Currently highlighted index, or -1 when none is active.
 * @param args.setActiveIndex - Callback used to update highlighted result index.
 * @param args.selectItem - Callback used to commit the selected item.
 * @param args.clearResults - Callback that empties the current result list.
 * @param args.searchInput - Lookup search input element.
 */
export function handleLookupKeydown(args: HandleLookupKeydownArgs): void {
    const { event, currentItems, activeIndex, searchInput } = args;
    const SET_ACTIVE_INDEX = (index: number): void => {
        args.setActiveIndex(index);
    };
    const SELECT_ITEM = (index: number): void => {
        args.selectItem(index);
    };
    const CLEAR_LOOKUP_RESULTS = (): void => {
        args.clearResults();
    };
    switch (event.key) {
        case "ArrowDown":
            handleArrowDown(event, currentItems, activeIndex, SET_ACTIVE_INDEX);
            return;
        case "ArrowUp":
            handleArrowUp(event, currentItems, activeIndex, SET_ACTIVE_INDEX);
            return;
        case "Enter":
            handleEnter(event, currentItems, activeIndex, SELECT_ITEM);
            return;
        case "Escape":
            handleEscape(CLEAR_LOOKUP_RESULTS, searchInput);
            return;
        default:
            return;
    }
}
