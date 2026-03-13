import type { BindingArgs } from "../../types/types.js";
import {
    lookupResultTarget,
    shouldKeepPickerOpen,
    wrapIndex,
} from "./after_book_picker_helpers.js";
import { NO_ACTIVE_INDEX } from "./after_book_picker_render.js";

function bindPickerInputEvents(args: BindingArgs): void {
    args.refs.afterBookInput.addEventListener("focus", () => {
        args.refreshFiltered(false);
    });
    args.refs.afterBookInput.addEventListener("input", () => {
        args.refreshFiltered(true);
    });
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
    const PICKER_STATE = args.state;
    args.refs.afterBookInput.addEventListener(
        "keydown",
        (event: KeyboardEvent) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                PICKER_STATE.activeIndex = wrapIndex(
                    PICKER_STATE.activeIndex + 1,
                    PICKER_STATE.filtered.length,
                );
                args.render();
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                PICKER_STATE.activeIndex = wrapIndex(
                    PICKER_STATE.activeIndex - 1,
                    PICKER_STATE.filtered.length,
                );
                args.render();
                return;
            }
            if (
                event.key === "Enter" &&
                PICKER_STATE.activeIndex > NO_ACTIVE_INDEX
            ) {
                event.preventDefault();
                args.selectBook(
                    PICKER_STATE.filtered[PICKER_STATE.activeIndex],
                );
                return;
            }
            if (event.key === "Escape") {
                args.clearResults();
                args.render();
                args.refs.afterBookInput.blur();
            }
        },
    );
}

/**
 * Attach mousemove and click handlers to the afterBookResults element to update the active result on hover and select a book on click.
 * @example
 * bindPickerResultsEvents({ refs: { afterBookResults: document.querySelector('.results') }, state: { activeIndex: 0, filtered: [] }, render: () => {}, selectBook: () => {} })
 * undefined
 * @param {{BindingArgs}} {{args}} - BindingArgs object containing refs (with afterBookResults HTMLElement), state, render function, and selectBook callback.
 * @returns {{void}} Return nothing.
 **/
function bindPickerResultsEvents(args: BindingArgs): void {
    args.refs.afterBookResults.addEventListener(
        "mousemove",
        (event: MouseEvent) => {
            const TARGET = lookupResultTarget(event);
            if (!TARGET) {
                return;
            }
            args.state.activeIndex = Number(TARGET.dataset.resultIndex);
            args.render();
        },
    );
    args.refs.afterBookResults.addEventListener(
        "click",
        (event: MouseEvent) => {
            const TARGET = lookupResultTarget(event);
            if (!TARGET) {
                return;
            }
            const RESULT_INDEX = Number(TARGET.dataset.resultIndex);
            args.selectBook(args.state.filtered[RESULT_INDEX]);
        },
    );
}

/**
 * Binds a document click listener that clears and re-renders the after-book picker when clicking outside it.
 * @example
 * bindPickerOutsideClick({ refs: { afterBookInput: inputEl, afterBookResults: resultsEl }, clearResults: () => {}, render: () => {} })
 * undefined
 * @param {{BindingArgs}} {{args}} - Binding arguments containing refs to input/results and callbacks to clear and render picker.
 * @returns {{void}} No return value.
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
