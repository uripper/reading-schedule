import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import type { Options } from "flatpickr/dist/types/options";

const DATE_FORMAT = "Y-m-d";
const NEXT_MONTH_LABEL = "Next";
const PREVIOUS_MONTH_LABEL = "Prev";

const PICKERS = new WeakMap<HTMLInputElement, Instance>();

interface StaticDatePickerArgs {
    host: HTMLElement;
    input: HTMLInputElement;
    minimumDate: string | undefined;
    onChange(): void;
    onClose(): void;
    onOpen(): void;
    onReady(): void;
    onValueUpdate(): void;
    positionElement: HTMLElement;
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

function pickerBaseOptions(args: StaticDatePickerArgs): Partial<Options> {
    return {
        allowInput: false,
        appendTo: args.host,
        clickOpens: true,
        closeOnSelect: true,
        dateFormat: DATE_FORMAT,
        disableMobile: true,
        minDate: args.minimumDate,
        monthSelectorType: "static",
        nextArrow: NEXT_MONTH_LABEL,
        position: "auto left",
        positionElement: args.positionElement,
        prevArrow: PREVIOUS_MONTH_LABEL,
        static: true,
    };
}

function pickerLifecycleOptions(args: StaticDatePickerArgs): Partial<Options> {
    return {
        onChange: args.onChange,
        onClose: args.onClose,
        onOpen: args.onOpen,
        onReady: args.onReady,
        onValueUpdate: args.onValueUpdate,
    };
}

function pickerOptions(args: StaticDatePickerArgs): Partial<Options> {
    return {
        ...pickerBaseOptions(args),
        ...pickerLifecycleOptions(args),
    };
}

export function bindStaticDatePicker(args: StaticDatePickerArgs): void {
    const PICKER = flatpickr(args.input, pickerOptions(args));
    PICKERS.set(args.input, PICKER);
}

export function clearDatePicker(input: HTMLInputElement): void {
    pickerInstance(input)?.clear(false);
}

export function closeDatePicker(input: HTMLInputElement): void {
    pickerInstance(input)?.close();
}

export function openDatePicker(input: HTMLInputElement): void {
    pickerInstance(input)?.open();
}

export function syncDatePickerDisabled(
    input: HTMLInputElement,
    disabled: boolean,
): void {
    const PICKER = pickerInstance(input);
    if (PICKER === null) {
        return;
    }
    PICKER.set("clickOpens", !disabled);
    if (disabled) {
        PICKER.close();
    }
}

export function syncDatePickerValue(
    input: HTMLInputElement,
    afterSync: () => void,
): void {
    const PICKER = pickerInstance(input);
    if (PICKER === null) {
        return;
    }
    const VALUE = input.value.trim();
    if (VALUE === "") {
        if (PICKER.selectedDates.length > 0) {
            PICKER.clear(false);
        }
        afterSync();
        return;
    }
    if (currentPickerValue(PICKER) === VALUE) {
        afterSync();
        return;
    }
    PICKER.setDate(VALUE, false, DATE_FORMAT);
    afterSync();
}
