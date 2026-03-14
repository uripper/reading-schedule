import type {
    CreateLookupStateControllerArgs,
    LookupStateController,
} from "../../types/types.ts";
import { describeLookup } from "./helpers.ts";
import { renderLookupResults, updateComboboxA11y } from "./render.ts";

function boundedIndex(index: number, length: number): number {
    return ((index % length) + length) % length;
}

interface LookupControllerDeps {
    metaEl: HTMLElement;
    onPick: CreateLookupStateControllerArgs["onPick"];
    placeholder: string;
    resultsEl: HTMLElement;
    searchInput: HTMLInputElement;
    state: CreateLookupStateControllerArgs["state"];
}

function clearRenderedLookupResults(
    resultsEl: HTMLElement,
    searchInput: HTMLInputElement,
): void {
    const RESULTS_EL = resultsEl;
    RESULTS_EL.classList.remove("has-items");
    RESULTS_EL.replaceChildren();
    updateComboboxA11y(searchInput, RESULTS_EL, false, -1);
}

function updateRenderedLookupA11y(deps: LookupControllerDeps): void {
    updateComboboxA11y(
        deps.searchInput,
        deps.resultsEl,
        true,
        deps.state.activeIndex,
    );
}

function renderLookupItems(deps: LookupControllerDeps): void {
    const RESULTS_EL = deps.resultsEl;
    renderLookupResults(
        RESULTS_EL,
        deps.state.currentItems,
        deps.placeholder,
        deps.state.activeIndex,
    );
    RESULTS_EL.classList.add("has-items");
    updateRenderedLookupA11y(deps);
}

/**
 * Update the lookup results DOM based on the current state: render items, toggle the "has-items" class, and update combobox accessibility attributes.
 * @example
 * refreshLookupResults(deps)
 * undefined
 * @param deps - Dependencies and DOM/state references required to render and update lookup results.
 * @returns No return value; updates the DOM and accessibility attributes.
 **/
function refreshLookupResults(deps: LookupControllerDeps): void {
    if (deps.state.currentItems.length === 0) {
        clearRenderedLookupResults(deps.resultsEl, deps.searchInput);
        return;
    }
    renderLookupItems(deps);
}

function resetLookupState(
    state: CreateLookupStateControllerArgs["state"],
): void {
    const LOOKUP_STATE = state;
    LOOKUP_STATE.currentItems = [];
    LOOKUP_STATE.activeIndex = -1;
}

function clearLookupResults(deps: LookupControllerDeps): void {
    resetLookupState(deps.state);
    refreshLookupResults(deps);
}

function applySelectedLookupItem(
    item: NonNullable<
        CreateLookupStateControllerArgs["state"]["currentItems"][number]
    >,
    searchInput: HTMLInputElement,
    metaEl: HTMLElement,
): void {
    const SEARCH_INPUT = searchInput;
    const META_EL = metaEl;
    SEARCH_INPUT.value = String(item.title ?? "");
    META_EL.textContent = describeLookup(item);
}

function selectLookupItem(deps: LookupControllerDeps, index: number): void {
    if (index < 0 || index >= deps.state.currentItems.length) {
        return;
    }
    const ITEM = deps.state.currentItems[index];
    applySelectedLookupItem(ITEM, deps.searchInput, deps.metaEl);
    clearLookupResults(deps);
    deps.onPick(ITEM);
}

function updateActiveLookupIndex(
    state: CreateLookupStateControllerArgs["state"],
    index: number,
): void {
    const LOOKUP_STATE = state;
    if (LOOKUP_STATE.currentItems.length === 0) {
        LOOKUP_STATE.activeIndex = -1;
        return;
    }
    LOOKUP_STATE.activeIndex = boundedIndex(
        index,
        LOOKUP_STATE.currentItems.length,
    );
}

/**
 * Update the lookup state's active index (bounded to available items) and refresh the displayed results.
 * @example
 * setLookupActiveIndex(deps, 2)
 * undefined
 * @param deps - Lookup controller dependencies containing state and helpers.
 * @param index - Desired active index; will be clamped to valid range or set to -1 if no items.
 * @returns No return value; updates the state's activeIndex and refreshes lookup results.
 **/
function setLookupActiveIndex(deps: LookupControllerDeps, index: number): void {
    updateActiveLookupIndex(deps.state, index);
    refreshLookupResults(deps);
}

function createLookupControllerDeps(
    args: CreateLookupStateControllerArgs,
): LookupControllerDeps {
    return {
        metaEl: args.metaEl,
        onPick: args.onPick,
        placeholder: args.placeholder,
        resultsEl: args.resultsEl,
        searchInput: args.searchInput,
        state: args.state,
    };
}

function createLookupControllerHandlers(
    deps: LookupControllerDeps,
): LookupStateController {
    return {
        clearResults: (): void => {
            clearLookupResults(deps);
        },
        refreshResults: (): void => {
            refreshLookupResults(deps);
        },
        selectItem: (index: number): void => {
            selectLookupItem(deps, index);
        },
        setActiveIndex: (index: number): void => {
            setLookupActiveIndex(deps, index);
        },
    };
}

/**
 * Creates lookup state actions for rendering, clearing, selecting, and highlighting items.
 * @param root0 - Lookup UI elements, callbacks, and mutable state.
 * @param searchInput - Search field element.
 * @param resultsEl - Lookup results container element.
 * @param metaEl - Metadata/help text element.
 * @param onPick - Callback invoked when a result is selected.
 * @param placeholder - Placeholder cover image URL.
 * @param state - Mutable lookup state containing items and active index.
 * @returns State controller methods for lookup UI updates.
 */
export function createLookupStateController({
    searchInput,
    resultsEl,
    metaEl,
    onPick,
    placeholder,
    state,
}: CreateLookupStateControllerArgs): LookupStateController {
    return createLookupControllerHandlers(
        createLookupControllerDeps({
            metaEl,
            onPick,
            placeholder,
            resultsEl,
            searchInput,
            state,
        }),
    );
}
