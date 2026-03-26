import type {
    BookLookupItem,
    HandleLookupKeydownArgs,
    SetActiveIndex,
} from "../../types/types.ts";

// TODO: Move these interfaces to packages/contracts
interface LookupNavigationArgs {
    activeIndex: number;
    currentItems: readonly BookLookupItem[];
    event: KeyboardEvent;
    setActiveIndex: SetActiveIndex;
}

interface LookupSelectionArgs {
    activeIndex: number;
    currentItems: readonly BookLookupItem[];
    event: KeyboardEvent;
    selectItem: HandleLookupKeydownArgs["selectItem"];
}

type ArrowStep = {
    initialIndex: number;
    indexDelta: number;
};

function handleArrowNavigation(
    args: LookupNavigationArgs,
    step: ArrowStep,
): void {
    args.event.preventDefault();

    if (args.currentItems.length === 0) {
        return;
    }

    if (args.activeIndex < 0) {
        args.setActiveIndex(step.initialIndex);
        return;
    }

    args.setActiveIndex(args.activeIndex + step.indexDelta);
}

/**
 * Moves highlight to the previous search result when ArrowUp is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param setActiveIndex - Callback used to update highlighted result index.
 */
function handleArrowUp(args: LookupNavigationArgs): void {
    handleArrowNavigation(args, {
        indexDelta: -1,
        initialIndex: args.currentItems.length - 1,
    });
}

/**
 * Moves highlight to the next search result when ArrowDown is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param setActiveIndex - Callback used to update highlighted result index.
 */
function handleArrowDown(args: LookupNavigationArgs): void {
    handleArrowNavigation(args, {
        indexDelta: 1,
        initialIndex: 0,
    });
}

/**
 * Selects the currently highlighted lookup result when Enter is pressed.
 * @param event - Keyboard event for the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param selectItem - Callback used to commit the selected item.
 */
function handleEnter(args: LookupSelectionArgs): void {
    if (args.activeIndex < 0 || !args.currentItems.length) {
        return;
    }
    args.event.preventDefault();
    args.selectItem(args.activeIndex);
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

function lookupNavigationArgs(
    args: HandleLookupKeydownArgs,
): LookupNavigationArgs {
    return {
        activeIndex: args.activeIndex,
        currentItems: args.currentItems,
        event: args.event,
        setActiveIndex: args.setActiveIndex,
    };
}

function handleLookupArrowKey(args: HandleLookupKeydownArgs): boolean {
    if (args.event.key === "ArrowDown") {
        handleArrowDown(lookupNavigationArgs(args));
        return true;
    }
    if (args.event.key === "ArrowUp") {
        handleArrowUp(lookupNavigationArgs(args));
        return true;
    }
    return false;
}

function handleLookupActionKey(args: HandleLookupKeydownArgs): boolean {
    if (args.event.key === "Enter") {
        handleEnter({
            activeIndex: args.activeIndex,
            currentItems: args.currentItems,
            event: args.event,
            selectItem: args.selectItem,
        });
        return true;
    }
    if (args.event.key === "Escape") {
        handleEscape(args.clearResults, args.searchInput);
        return true;
    }
    return false;
}

/**
 * Routes lookup keyboard events to navigation and selection handlers.
 * @param args - Lookup keyboard event payload and state callbacks.
 * @param event - Keyboard event from the lookup input.
 * @param currentItems - Current result list shown in the lookup menu.
 * @param activeIndex - Currently highlighted index, or -1 when none is active.
 * @param setActiveIndex - Callback used to update highlighted result index.
 * @param selectItem - Callback used to commit the selected item.
 * @param clearResults - Callback that empties the current result list.
 * @param searchInput - Lookup search input element.
 */
export function handleLookupKeydown(args: HandleLookupKeydownArgs): void {
    if (handleLookupArrowKey(args)) {
        return;
    }
    handleLookupActionKey(args);
}
