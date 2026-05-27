import type { LookupInputHandlerArgs } from "../../types/types.ts";
import { getPlannerApi } from "../app/planner_api.ts";

const LOOKUP_DELAY_MS = 260;
const LOOKUP_SEARCHING_TEXT = "Searching Open Library...";
const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

type LookupInputDeps = Pick<
    LookupInputHandlerArgs,
    "clearResults" | "metaEl" | "refreshResults" | "searchInput" | "state"
>;

interface RunLookupSearchArgs {
    clearResults: () => void;
    currentToken: number;
    lookupState: LookupInputHandlerArgs["state"];
    query: string;
    refreshResults: () => void;
    searchInput: HTMLInputElement;
    statusElement: HTMLElement;
}

function clearPendingLookupTimer(
    lookupState: LookupInputHandlerArgs["state"],
): void {
    if (lookupState.timer === null) {
        return;
    }
    clearTimeout(lookupState.timer);
    const LOOKUP_STATE = lookupState;
    LOOKUP_STATE.timer = null;
}

function clearLookupStatus(
    clearResults: () => void,
    searchInput: HTMLInputElement,
    statusElement: HTMLElement,
): void {
    const STATUS_ELEMENT = statusElement;
    clearResults();
    searchInput.removeAttribute("aria-busy");
    STATUS_ELEMENT.textContent = "";
}

function applyLookupSearchingStatus(
    clearResults: () => void,
    searchInput: HTMLInputElement,
    statusElement: HTMLElement,
): void {
    const STATUS_ELEMENT = statusElement;
    clearResults();
    searchInput.setAttribute("aria-busy", "true");
    STATUS_ELEMENT.textContent = LOOKUP_SEARCHING_TEXT;
}

function isStaleLookupToken(
    currentToken: number,
    lookupState: LookupInputHandlerArgs["state"],
): boolean {
    return currentToken !== lookupState.token;
}

function applyLookupItems(
    items: LookupInputHandlerArgs["state"]["currentItems"],
    lookupState: LookupInputHandlerArgs["state"],
): void {
    const LOOKUP_STATE = lookupState;
    LOOKUP_STATE.currentItems = items;
    LOOKUP_STATE.activeIndex = -1;
    if (items.length > 0) {
        LOOKUP_STATE.activeIndex = 0;
    }
}

function applyEmptyLookupResult(options: {
    clearResults: () => void;
    statusElement: HTMLElement;
}): void {
    const STATUS_ELEMENT = options.statusElement;
    options.clearResults();
    STATUS_ELEMENT.textContent = "No matches found.";
}

function applyLookupSuccess(options: {
    clearResults: () => void;
    currentToken: number;
    fetchedItems: Awaited<
        ReturnType<ReturnType<typeof getPlannerApi>["searchBooks"]>
    >;
    lookupState: LookupInputHandlerArgs["state"];
    refreshResults: () => void;
    searchInput: HTMLInputElement;
    statusElement: HTMLElement;
}): void {
    const STATUS_ELEMENT = options.statusElement;
    if (isStaleLookupToken(options.currentToken, options.lookupState)) {
        return;
    }
    options.searchInput.removeAttribute("aria-busy");
    const ITEMS = options.fetchedItems.slice(0, RESULT_LIMIT);
    applyLookupItems(ITEMS, options.lookupState);
    if (ITEMS.length === 0) {
        applyEmptyLookupResult(options);
        return;
    }
    options.refreshResults();
    STATUS_ELEMENT.textContent = "Select a result to fill details.";
}

function applyLookupFailure(options: {
    clearResults: () => void;
    currentToken: number;
    lookupState: LookupInputHandlerArgs["state"];
    searchInput: HTMLInputElement;
    statusElement: HTMLElement;
}): void {
    const STATUS_ELEMENT = options.statusElement;
    if (isStaleLookupToken(options.currentToken, options.lookupState)) {
        return;
    }
    options.clearResults();
    options.searchInput.removeAttribute("aria-busy");
    STATUS_ELEMENT.textContent = "Lookup unavailable; enter values manually.";
}

function nextLookupToken(lookupState: LookupInputHandlerArgs["state"]): number {
    const LOOKUP_STATE = lookupState;
    LOOKUP_STATE.token += 1;
    return LOOKUP_STATE.token;
}

function lookupSearchSuccessHandler(
    args: RunLookupSearchArgs,
    currentToken: number,
): (
    fetchedItems: Awaited<
        ReturnType<ReturnType<typeof getPlannerApi>["searchBooks"]>
    >,
) => void {
    return (fetchedItems): void => {
        applyLookupSuccess({
            clearResults: args.clearResults,
            currentToken,
            fetchedItems,
            lookupState: args.lookupState,
            refreshResults: args.refreshResults,
            searchInput: args.searchInput,
            statusElement: args.statusElement,
        });
    };
}

function lookupSearchFailureHandler(
    args: RunLookupSearchArgs,
    currentToken: number,
): () => void {
    return (): void => {
        applyLookupFailure({
            clearResults: args.clearResults,
            currentToken,
            lookupState: args.lookupState,
            searchInput: args.searchInput,
            statusElement: args.statusElement,
        });
    };
}

function fetchLookupSearch(
    args: RunLookupSearchArgs,
    currentToken: number,
): void {
    getPlannerApi()
        .searchBooks(args.query)
        .then(lookupSearchSuccessHandler(args, currentToken))
        .catch(lookupSearchFailureHandler(args, currentToken));
}

function runLookupSearch(args: RunLookupSearchArgs): void {
    fetchLookupSearch(args, args.currentToken);
}

function scheduleLookupSearch(args: RunLookupSearchArgs): void {
    const LOOKUP_STATE = args.lookupState;
    LOOKUP_STATE.timer = setTimeout((): void => {
        LOOKUP_STATE.timer = null;
        runLookupSearch(args);
    }, LOOKUP_DELAY_MS);
}

function handleLookupInput(deps: LookupInputDeps): void {
    const QUERY = deps.searchInput.value.trim();
    clearPendingLookupTimer(deps.state);
    const CURRENT_TOKEN = nextLookupToken(deps.state);
    if (QUERY.length < MIN_QUERY_LENGTH) {
        clearLookupStatus(deps.clearResults, deps.searchInput, deps.metaEl);
        return;
    }
    applyLookupSearchingStatus(
        deps.clearResults,
        deps.searchInput,
        deps.metaEl,
    );
    scheduleLookupSearch({
        clearResults: deps.clearResults,
        currentToken: CURRENT_TOKEN,
        lookupState: deps.state,
        query: QUERY,
        refreshResults: deps.refreshResults,
        searchInput: deps.searchInput,
        statusElement: deps.metaEl,
    });
}

/**
 * Creates the debounced input handler that performs remote book lookup.
 * @param root0 - Dependencies required for lookup query execution and rendering.
 * @param searchInput - Search field element.
 * @param metaEl - Metadata/help text element for lookup status.
 * @param state - Mutable lookup state (token, timer, current items).
 * @param clearResults - Clears current rendered lookup results.
 * @param refreshResults - Re-renders lookup results from current state.
 * @returns Input event handler for search field changes.
 */
export function createLookupInputHandler({
    searchInput,
    metaEl,
    state,
    clearResults,
    refreshResults,
}: LookupInputHandlerArgs): () => void {
    return (): void => {
        handleLookupInput({
            clearResults,
            metaEl,
            refreshResults,
            searchInput,
            state,
        });
    };
}
