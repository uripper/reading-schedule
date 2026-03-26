import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
const CLEAR_BUTTON_LABEL = "Clear";
const DATE_FORMAT = "Y-m-d";
const DATE_INPUT_BOUND = "true";
const OPEN_CLASS = "is-open";
const PREVIOUS_MONTH_LABEL = "Prev";
const NEXT_MONTH_LABEL = "Next";

type BoundDateInputOptions = {
    allowEmpty: boolean;
    minimumDate: string;
    placeholder: string;
};

const PICKERS = new WeakMap<HTMLInputElement, Instance>();

function inputShell(input: HTMLInputElement): HTMLElement | null {
    return input.closest<HTMLElement>(".date-input-shell");
}

function pickerHost(input: HTMLInputElement): HTMLElement {
    let current = input.parentElement;
    while (current !== null) {
        if (current.tagName === "DIALOG") {
            return current;
        }
        current = current.parentElement;
    }
    return document.body;
}

function clearButton(input: HTMLInputElement): HTMLButtonElement | null {
    return inputShell(input)?.querySelector<HTMLButtonElement>(
        ".date-input-clear",
    ) ?? null;
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

function pickerInstance(input: HTMLInputElement): Instance | null {
    return PICKERS.get(input) ?? null;
}

function currentPickerValue(picker: Instance): string {
    const SELECTED = picker.selectedDates[0];
    if (SELECTED === undefined) {
        return "";
    }
    return picker.formatDate(SELECTED, DATE_FORMAT);
}

function syncPickerValue(input: HTMLInputElement): void {
    const PICKER = pickerInstance(input);
    if (PICKER === null) {
        return;
    }
    const VALUE = input.value.trim();
    if (VALUE === "") {
        if (PICKER.selectedDates.length > 0) {
            PICKER.clear(false);
        }
        syncClearButton(input);
        return;
    }
    if (currentPickerValue(PICKER) === VALUE) {
        syncClearButton(input);
        return;
    }
    PICKER.setDate(VALUE, false, DATE_FORMAT);
    syncClearButton(input);
}

function clearDateInputValue(input: HTMLInputElement): void {
    input.value = "";
    pickerInstance(input)?.clear(false);
    syncClearButton(input);
    dispatchDateChange(input);
}

function bindInputKeys(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
    openPicker: (() => void) | null,
): void {
    input.addEventListener("keydown", (event) => {
        if (
            openPicker !== null &&
            (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")
        ) {
            event.preventDefault();
            syncPickerValue(input);
            openPicker();
            return;
        }
        if (!options.allowEmpty) {
            return;
        }
        if (event.key !== "Backspace" && event.key !== "Delete") {
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
    SHELL.className = "date-input-shell";
    input.replaceWith(SHELL);
    SHELL.append(input);

    let clear = null;
    if (options.allowEmpty) {
        clear = document.createElement("button");
        clear.className = "btn date-input-clear";
        clear.type = "button";
        clear.textContent = CLEAR_BUTTON_LABEL;
        clear.setAttribute("aria-label", "Clear selected date");
        SHELL.append(clear);
    }

    input.classList.add("date-input-field");
    input.placeholder = options.placeholder;
    input.readOnly = true;
    input.spellcheck = false;
    input.type = "text";

    return clear;
}

function createPicker(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): Instance {
    const HOST = pickerHost(input);
    const POSITION_ELEMENT = inputShell(input) ?? input;
    const PICKER = flatpickr(input, {
        allowInput: false,
        appendTo: HOST,
        clickOpens: true,
        closeOnSelect: true,
        dateFormat: DATE_FORMAT,
        disableMobile: true,
        minDate: options.minimumDate === "" ? undefined : options.minimumDate,
        monthSelectorType: "static",
        nextArrow: NEXT_MONTH_LABEL,
        position: "auto left",
        positionElement: POSITION_ELEMENT,
        prevArrow: PREVIOUS_MONTH_LABEL,
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
    });
    return PICKER;
}

function bindBrowserDateInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): void {
    const CLEAR_BUTTON = decorateInput(input, options);
    const PICKER = createPicker(input, options);
    PICKERS.set(input, PICKER);
    input.dataset.dateInputBound = DATE_INPUT_BOUND;
    input.addEventListener("click", () => {
        syncPickerValue(input);
        PICKER.open();
    });
    CLEAR_BUTTON?.addEventListener("click", () => {
        clearDateInputValue(input);
        PICKER.close();
    });
    bindInputKeys(input, options, () => {
        pickerInstance(input)?.open();
    });
    syncPickerValue(input);
}

function bindFallbackDateInput(
    input: HTMLInputElement,
    options: BoundDateInputOptions,
): void {
    const CLEAR_BUTTON = decorateInput(input, options);
    input.dataset.dateInputBound = DATE_INPUT_BOUND;
    CLEAR_BUTTON?.addEventListener("click", () => {
        clearDateInputValue(input);
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
    input.disabled = disabled;
    const CLEAR = clearButton(input);
    if (CLEAR !== null) {
        CLEAR.disabled = disabled || input.value.trim() === "";
    }
    const PICKER = pickerInstance(input);
    if (PICKER === null) {
        return;
    }
    PICKER.set("clickOpens", !disabled);
    if (disabled) {
        PICKER.close();
        return;
    }
    syncPickerValue(input);
}
