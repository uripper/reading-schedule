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
 * @param args.clearResults - Clears currently filtered picker results.
 * @param args.refs - Form references containing picker controls.
 * @param args.refreshFiltered - Rebuilds filtered picker options from input text.
 * @param args.render - Re-renders picker result UI.
 * @param args.selectBook - Selects a book from filtered options.
 * @param args.state - Mutable picker state.
 */
export function bindAfterBookPickerEvents(args: BindingArgs): void {
    bindPickerInputEvents(args);
    bindPickerKeyboardEvents(args);
    bindPickerResultsEvents(args);
    bindPickerOutsideClick(args);
}
