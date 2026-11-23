/**
 * Keyboard, pointer, and focus handling for the After Book combobox: typing
 * filters (type-ahead), arrows move the highlight and reopen a closed menu,
 * Enter chooses, Escape closes the menu without closing the dialog, leaving
 * the field closes it, and the clear button removes the dependency.
 */
import type { BindingArgs } from "../../types/types.ts";
import { lookupResultTarget, wrapIndex } from "./after_book_picker_helpers.ts";
import { NO_ACTIVE_INDEX } from "./after_book_picker_render.ts";

const STEP_DOWN = 1;
const STEP_UP = -1;
const CLEAR_BUTTON_ID = "bookAfterBookClearBtn";

/**
 * Checks whether the menu is showing rows.
 * @param args - Picker bindings.
 * @returns `true` when rows are listed.
 */
function isOpen(args: BindingArgs): boolean {
    return args.state.filtered.length > 0;
}

/**
 * Closes the menu.
 * @param args - Picker bindings.
 */
function closeMenu(args: BindingArgs): void {
    args.clearResults();
    args.render();
}

/**
 * Moves the highlight, reopening the menu first when it is closed.
 * @param args - Picker bindings.
 * @param event - Arrow key event.
 * @param step - `1` for down, `-1` for up.
 */
function onArrow(args: BindingArgs, event: KeyboardEvent, step: number): void {
    event.preventDefault();
    if (!isOpen(args)) {
        args.refreshFiltered(false);
        if (step === STEP_UP && isOpen(args)) {
            args.state.activeIndex = args.state.filtered.length - 1;
            args.render();
        }
        return;
    }
    const STATE = args.state;
    STATE.activeIndex = wrapIndex(
        STATE.activeIndex + step,
        STATE.filtered.length,
    );
    args.render();
}

/**
 * Chooses the highlighted row. Enter never submits the form from here.
 * @param args - Picker bindings.
 * @param event - Enter key event.
 */
function onEnter(args: BindingArgs, event: KeyboardEvent): void {
    if (args.state.activeIndex <= NO_ACTIVE_INDEX) {
        return;
    }
    event.preventDefault();
    args.selectBook(args.state.filtered[args.state.activeIndex]);
}

/**
 * Closes an open menu and keeps the dialog open.
 * @param args - Picker bindings.
 * @param event - Escape key event.
 */
function onEscape(args: BindingArgs, event: KeyboardEvent): void {
    if (!isOpen(args)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    closeMenu(args);
}

const KEY_HANDLERS: Partial<
    Record<string, (args: BindingArgs, event: KeyboardEvent) => void>
> = {
    ArrowDown: (args, event) => {
        onArrow(args, event, STEP_DOWN);
    },
    ArrowUp: (args, event) => {
        onArrow(args, event, STEP_UP);
    },
    Enter: onEnter,
    Escape: onEscape,
};

/**
 * Binds focus, typing, keys, and leaving the field.
 * @param args - Picker bindings.
 */
function bindInputEvents(args: BindingArgs): void {
    const INPUT = args.refs.afterBookInput;
    INPUT.addEventListener("focus", () => {
        args.refreshFiltered(false);
    });
    INPUT.addEventListener("input", () => {
        args.refreshFiltered(true);
    });
    INPUT.addEventListener("keydown", (event: KeyboardEvent) => {
        KEY_HANDLERS[event.key]?.(args, event);
    });
    INPUT.addEventListener("blur", () => {
        if (isOpen(args)) {
            closeMenu(args);
        }
    });
}

/**
 * Reads the row position under a pointer event.
 * @param event - Pointer event inside the menu.
 * @returns Row position, or `null` outside any row.
 */
function eventResultIndex(event: Event): number | null {
    const TARGET = lookupResultTarget(event);
    if (!TARGET) {
        return null;
    }
    return Number(TARGET.dataset.resultIndex);
}

/**
 * Highlights hovered rows and chooses clicked ones, keeping focus in the field.
 * @param args - Picker bindings.
 */
function bindResultEvents(args: BindingArgs): void {
    const RESULTS = args.refs.afterBookResults;
    RESULTS.addEventListener("mousedown", (event: MouseEvent) => {
        event.preventDefault();
    });
    RESULTS.addEventListener("mousemove", (event: MouseEvent) => {
        const INDEX = eventResultIndex(event);
        if (INDEX === null || INDEX === args.state.activeIndex) {
            return;
        }
        const STATE = args.state;
        STATE.activeIndex = INDEX;
        args.render();
    });
    RESULTS.addEventListener("click", (event: MouseEvent) => {
        const INDEX = eventResultIndex(event);
        if (INDEX !== null) {
            args.selectBook(args.state.filtered[INDEX]);
        }
    });
}

/**
 * Removes the dependency when the clear button is pressed.
 * @param args - Picker bindings.
 */
function bindClearButton(args: BindingArgs): void {
    document.getElementById(CLEAR_BUTTON_ID)?.addEventListener("click", () => {
        const INPUT = args.refs.afterBookInput;
        args.clearSelection();
        INPUT.value = "";
        closeMenu(args);
        INPUT.focus();
    });
}

/**
 * Binds every After Book picker interaction.
 * @param args - Picker state, refs, and actions.
 */
export function bindAfterBookPickerEvents(args: BindingArgs): void {
    bindInputEvents(args);
    bindResultEvents(args);
    bindClearButton(args);
}
