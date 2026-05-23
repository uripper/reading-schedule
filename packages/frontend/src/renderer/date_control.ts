import {
    bindStaticDatePicker,
    clearDatePicker,
    closeDatePicker,
    openDatePicker,
    syncDatePickerDisabled,
    syncDatePickerValue,
} from "./date-control-flatpickr.ts";

const CLEAR_BUTTON_LABEL = "Clear";
const DATE_INPUT_BOUND = "true";
const OPEN_CLASS = "is-open";

type BoundDateInputOptions = {
    allowEmpty: boolean;
    minimumDate: string;
    placeholder: string;
};

function inputShell(input: HTMLInputElement): HTMLElement | null {
    return input.closest<HTMLElement>(".date-input-shell");
}

function clearButton(input: HTMLInputElement): HTMLButtonElement | null {
    return (
        inputShell(input)?.querySelector<HTMLButtonElement>(
            ".date-input-clear",
        ) ?? null
    );
}

function normalizedMinimumDate(value: string | undefined): string {
    return String(value ?? "").trim();
}

function setShellOpen(input: HTMLInputElement, isOpen: boolean): void {
    inputShell(input)?.classList.toggle(OPEN_CLASS, isOpen);
}

function syncClearButton(input: HTMLInputElement): void {
    const BUTTON = clearButton(input);
    if (BUTTON === null) {
        return;
    }
    BUTTON.disabled = input.disabled || input.value.trim() === "";
}

function dispatchDateChange(input: HTMLInputElement): void {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncPickerValue(input: HTMLInputElement): void {
    syncDatePickerValue(input, () => {
        syncClearButton(input);
    });
}

function clearDateInputValue(input: HTMLInputElement): void {
    const TARGET_INPUT = input;
    TARGET_INPUT.value = "";
    clearDatePicker(TARGET_INPUT);
    syncClearButton(TARGET_INPUT);
    dispatchDateChange(TARGET_INPUT);
}

function shouldOpenPickerKey(
    event: KeyboardEvent,
    openPicker: (() => void) | null,
): boolean {
    if (openPicker === null) {
        return false;
    }
    return (
        event.key === "ArrowDown" || event.key === "Enter" || event.key === " "
    );
}

function shouldClearDateKey(
    event: KeyboardEvent,
    options: BoundDateInputOptions,
): boolean {
    if (!options.allowEmpty) {
        return false;
    }
    return event.key === "Backspace" || event.key === "Delete";
}

function bindInputKeys(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
    openPicker: (() => void) | null,
): void {
    input.addEventListener("keydown", (event) => {
        if (shouldOpenPickerKey(event, openPicker)) {
            event.preventDefault();
            syncPickerValue(input);
            openPicker?.();
            return;
        }
        if (!shouldClearDateKey(event, options)) {
            return;
        }
        event.preventDefault();
        clearDateInputValue(input);
    });
}

function decorateInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): HTMLButtonElement | null {
    const SHELL = document.createElement("div");
    const TARGET_INPUT = input;
    SHELL.className = "date-input-shell";
    TARGET_INPUT.replaceWith(SHELL);
    SHELL.append(TARGET_INPUT);

    let clear: HTMLButtonElement | null = null;
    if (options.allowEmpty) {
        clear = document.createElement("button");
        clear.className = "btn date-input-clear";
        clear.type = "button";
        clear.textContent = CLEAR_BUTTON_LABEL;
        clear.setAttribute("aria-label", "Clear selected date");
        SHELL.append(clear);
    }

    TARGET_INPUT.classList.add("date-input-field");
    TARGET_INPUT.placeholder = options.placeholder;
    TARGET_INPUT.readOnly = true;
    TARGET_INPUT.spellcheck = false;
    TARGET_INPUT.type = "text";

    return clear;
}

function normalizedPickerMinimumDate(
    options: BoundDateInputOptions,
): string | undefined {
    if (options.minimumDate === "") {
        return undefined;
    }
    return options.minimumDate;
}

function pickerLifecycle(input: HTMLInputElement) {
    return {
        onChange: () => {
            syncClearButton(input);
            dispatchDateChange(input);
        },
        onClose: () => {
            setShellOpen(input, false);
            syncClearButton(input);
        },
        onOpen: () => {
            setShellOpen(input, true);
        },
        onReady: () => {
            syncClearButton(input);
        },
        onValueUpdate: () => {
            syncClearButton(input);
        },
    };
}

function bindStaticPickerForInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): void {
    const SHELL = inputShell(input);
    bindStaticDatePicker({
        ...pickerLifecycle(input),
        host: SHELL ?? document.body,
        input,
        minimumDate: normalizedPickerMinimumDate(options),
        positionElement: SHELL ?? input,
    });
}

function bindBrowserPickerEvents(
    input: HTMLInputElement,
    clearButton: HTMLButtonElement | null,
    options: BoundDateInputOptions,
): void {
    input.addEventListener("click", () => {
        syncPickerValue(input);
        openDatePicker(input);
    });
    clearButton?.addEventListener("click", () => {
        clearDateInputValue(input);
        closeDatePicker(input);
    });
    bindInputKeys(input, options, () => {
        openDatePicker(input);
    });
}

function bindBrowserDateInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): void {
    const TARGET_INPUT = input;
    const CLEAR_BUTTON = decorateInput(input, options);
    bindStaticPickerForInput(TARGET_INPUT, options);
    TARGET_INPUT.dataset.dateInputBound = DATE_INPUT_BOUND;
    bindBrowserPickerEvents(TARGET_INPUT, CLEAR_BUTTON, options);
    syncPickerValue(TARGET_INPUT);
}

function bindFallbackDateInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): void {
    const TARGET_INPUT = input;
    const CLEAR_BUTTON = decorateInput(input, options);
    TARGET_INPUT.dataset.dateInputBound = DATE_INPUT_BOUND;
    CLEAR_BUTTON?.addEventListener("click", () => {
        clearDateInputValue(TARGET_INPUT);
    });
    bindInputKeys(input, options, null);
    syncClearButton(input);
}

export function bindDateInput(
    input: HTMLInputElement,
    options: {
        allowEmpty?: boolean;
        minimumDate?: string;
        placeholder?: string;
    } = {},
): void {
    if (input.dataset.dateInputBound === DATE_INPUT_BOUND) {
        return;
    }
    let allowEmpty = true;
    if (options.allowEmpty === false) {
        allowEmpty = false;
    }
    let placeholder = "";
    if (options.placeholder !== undefined) {
        placeholder = options.placeholder;
    }
    const NORMALIZED_OPTIONS: BoundDateInputOptions = {
        allowEmpty,
        minimumDate: normalizedMinimumDate(options.minimumDate),
        placeholder,
    };
    if (typeof globalThis.navigator !== "undefined") {
        bindBrowserDateInput(input, NORMALIZED_OPTIONS);
        return;
    }
    bindFallbackDateInput(input, NORMALIZED_OPTIONS);
}

export function syncDateInputDisabled(
    input: HTMLInputElement,
    disabled: boolean,
): void {
    const TARGET_INPUT = input;
    TARGET_INPUT.disabled = disabled;
    const CLEAR = clearButton(TARGET_INPUT);
    if (CLEAR !== null) {
        CLEAR.disabled = disabled || input.value.trim() === "";
    }
    syncDatePickerDisabled(TARGET_INPUT, disabled);
    if (disabled) {
        return;
    }
    syncPickerValue(input);
}
