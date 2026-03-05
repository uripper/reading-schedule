import type {
    CreateLookupStateControllerArgs,
    LookupStateController,
} from "../../types/types.js";
import { describeLookup } from "./helpers.js";
import { renderLookupResults, updateComboboxA11y } from "./render.js";

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

function refreshLookupResults(deps: LookupControllerDeps): void {
    const HAS_ITEMS = deps.state.currentItems.length > 0;
    if (!HAS_ITEMS) {
        deps.resultsEl.classList.remove("has-items");
        deps.resultsEl.innerHTML = "";
        updateComboboxA11y(deps.searchInput, deps.resultsEl, false, -1);
        return;
    }
    renderLookupResults(
        deps.resultsEl,
        deps.state.currentItems,
        deps.placeholder,
        deps.state.activeIndex,
    );
    deps.resultsEl.classList.add("has-items");
    updateComboboxA11y(
        deps.searchInput,
        deps.resultsEl,
        true,
        deps.state.activeIndex,
    );
}

function clearLookupResults(deps: LookupControllerDeps): void {
    deps.state.currentItems = [];
    deps.state.activeIndex = -1;
    refreshLookupResults(deps);
}

function selectLookupItem(deps: LookupControllerDeps, index: number): void {
    if (index < 0 || index >= deps.state.currentItems.length) {
        return;
    }
    const ITEM = deps.state.currentItems[index];
    deps.searchInput.value = String(ITEM.title ?? "");
    deps.metaEl.textContent = describeLookup(ITEM);
    clearLookupResults(deps);
    deps.onPick(ITEM);
}

function setLookupActiveIndex(deps: LookupControllerDeps, index: number): void {
    if (deps.state.currentItems.length === 0) {
        deps.state.activeIndex = -1;
        refreshLookupResults(deps);
        return;
    }
    deps.state.activeIndex = boundedIndex(
        index,
        deps.state.currentItems.length,
    );
    refreshLookupResults(deps);
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
    const LOOKUP_DEPS: LookupControllerDeps = {
        metaEl,
        onPick,
        placeholder,
        resultsEl,
        searchInput,
        state,
    };

    return {
        clearResults: (): void => {
            clearLookupResults(LOOKUP_DEPS);
        },
        refreshResults: (): void => {
            refreshLookupResults(LOOKUP_DEPS);
        },
        selectItem: (index: number): void => {
            selectLookupItem(LOOKUP_DEPS, index);
        },
        setActiveIndex: (index: number): void => {
            setLookupActiveIndex(LOOKUP_DEPS, index);
        },
    };
}
