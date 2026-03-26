import type { BindingArgs } from "../../types/types.ts";
import {
    lookupResultTarget,
    shouldKeepPickerOpen,
    wrapIndex,
} from "./after_book_picker_helpers.ts";
import { NO_ACTIVE_INDEX } from "./after_book_picker_render.ts";

type PickerArrowKeyArgs = {
    args: BindingArgs;
    event: KeyboardEvent;
    key: string;
    delta: number;
};

function bindPickerInputEvents(args: BindingArgs): void {
    args.refs.afterBookInput.addEventListener("focus", () => {
        args.refreshFiltered(false);
    });
    args.refs.afterBookInput.addEventListener("input", () => {
        args.refreshFiltered(true);
    });
}

function movePickerSelection(args: BindingArgs, delta: number): void {
    const PICKER_STATE = args.state;
    PICKER_STATE.activeIndex = wrapIndex(
        PICKER_STATE.activeIndex + delta,
        PICKER_STATE.filtered.length,
    );
    args.render();
}

function handlePickerArrowKey({
    args,
    delta,
    event,
    key,
}: PickerArrowKeyArgs): boolean {
    if (event.key !== key) {
        return false;
    }
    event.preventDefault();
    movePickerSelection(args, delta);
    return true;
}

function handlePickerEnterKey(
    args: BindingArgs,
    event: KeyboardEvent,
): boolean {
    const PICKER_STATE = args.state;
    if (event.key !== "Enter") {
        return false;
    }
    if (PICKER_STATE.activeIndex <= NO_ACTIVE_INDEX) {
        return false;
    }
    event.preventDefault();
    args.selectBook(PICKER_STATE.filtered[PICKER_STATE.activeIndex]);
    return true;
}

function handlePickerEscapeKey(
    args: BindingArgs,
    event: KeyboardEvent,
): boolean {
    if (event.key !== "Escape") {
        return false;
    }
    args.clearResults();
    args.render();
    args.refs.afterBookInput.blur();
    return true;
}

function onPickerKeydown(args: BindingArgs, event: KeyboardEvent): void {
    if (handlePickerArrowKey({ args, delta: 1, event, key: "ArrowDown" })) {
        return;
    }
    if (handlePickerArrowKey({ args, delta: -1, event, key: "ArrowUp" })) {
        return;
    }
    if (handlePickerEnterKey(args, event)) {
        return;
    }
    handlePickerEscapeKey(args, event);
}

/**
 * Attach keyboard handlers to the after-book input to navigate the filtered picker list, select an entry, or dismiss the picker.
 * @example
 * bindPickerKeyboardEvents({ state: pickerState, refs: pickerRefs, selectBook: fn, clearResults: fn, render: fn })
 * undefined
 * @param {BindingArgs} args - Binding object containing the picker state, DOM refs, and action callbacks used for navigation, selection, and rendering.
 * @returns {void} No return value.
 */
function bindPickerKeyboardEvents(args: BindingArgs): void {
    args.refs.afterBookInput.addEventListener(
        "keydown",
        (event: KeyboardEvent) => {
            onPickerKeydown(args, event);
        },
    );
}

function hoveredResultIndex(event: MouseEvent): number | null {
    const TARGET = lookupResultTarget(event);
    if (!TARGET) {
        return null;
    }
    return Number(TARGET.dataset.resultIndex);
}

function setPickerActiveIndex(args: BindingArgs, resultIndex: number): void {
    const PICKER_STATE = args.state;
    PICKER_STATE.activeIndex = resultIndex;
    args.render();
}

function selectPickerResult(args: BindingArgs, resultIndex: number): void {
    args.selectBook(args.state.filtered[resultIndex]);
}

function onPickerResultsMousemove(args: BindingArgs, event: MouseEvent): void {
    const RESULT_INDEX = hoveredResultIndex(event);
    if (RESULT_INDEX === null) {
        return;
    }
    setPickerActiveIndex(args, RESULT_INDEX);
}

function onPickerResultsClick(args: BindingArgs, event: MouseEvent): void {
    const RESULT_INDEX = hoveredResultIndex(event);
    if (RESULT_INDEX === null) {
        return;
    }
    selectPickerResult(args, RESULT_INDEX);
}

/**
 * Attach mousemove and click handlers to the afterBookResults element to update the active result on hover and select a book on click.
 * @example
 * bindPickerResultsEvents({ refs: { afterBookResults: document.querySelector('.results') }, state: { activeIndex: 0, filtered: [] }, render: () => {}, selectBook: () => {} })
 * undefined
 * @param args - BindingArgs object containing refs (with afterBookResults HTMLElement), state, render function, and selectBook callback.
 * @returns Return nothing.
 **/
function bindPickerResultsEvents(args: BindingArgs): void {
    args.refs.afterBookResults.addEventListener(
        "mousemove",
        (event: MouseEvent) => {
            onPickerResultsMousemove(args, event);
        },
    );
    args.refs.afterBookResults.addEventListener(
        "click",
        (event: MouseEvent) => {
            onPickerResultsClick(args, event);
        },
    );
}

/**
 * Binds a document click listener that clears and re-renders the after-book picker when clicking outside it.
 * @example
 * bindPickerOutsideClick({ refs: { afterBookInput: inputEl, afterBookResults: resultsEl }, clearResults: () => {}, render: () => {} })
 * undefined
 * @param args - Binding arguments containing refs to input/results and callbacks to clear and render picker.
 * @returns No return value.
 **/
function bindPickerOutsideClick(args: BindingArgs): void {
    document.addEventListener("click", (event: MouseEvent) => {
        if (!(event.target instanceof Node)) {
            return;
        }
        const KEEP_OPEN = shouldKeepPickerOpen({
            targetIsInput: event.target === args.refs.afterBookInput,
            targetIsInResults: args.refs.afterBookResults.contains(
                event.target,
            ),
        });
        if (KEEP_OPEN) {
            return;
        }
        args.clearResults();
        args.render();
    });
}

/**
 * Binds keyboard/mouse/document events for after-book picker interactions.
 * @param args - Event-binding dependencies and state hooks.
 * @param clearResults - Clears currently filtered picker results.
 * @param refs - Form references containing picker controls.
 * @param refreshFiltered - Rebuilds filtered picker options from input text.
 * @param render - Re-renders picker result UI.
 * @param selectBook - Selects a book from filtered options.
 * @param state - Mutable picker state.
 */
export function bindAfterBookPickerEvents(args: BindingArgs): void {
    bindPickerInputEvents(args);
    bindPickerKeyboardEvents(args);
    bindPickerResultsEvents(args);
    bindPickerOutsideClick(args);
}
