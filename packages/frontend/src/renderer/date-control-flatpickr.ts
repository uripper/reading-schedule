import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import type { Options } from "flatpickr/dist/types/options";

const DATE_FORMAT = "Y-m-d";
const NEXT_MONTH_LABEL = "Next";
const POSITION_OFFSET = 2;
const PREVIOUS_MONTH_LABEL = "Prev";

const PICKERS = new WeakMap<HTMLInputElement, Instance>();

interface BoundsLike {
    bottom: number;
    left: number;
    right: number;
    top: number;
}

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

interface DialogCalendarPlacementArgs {
    calendarHeight: number;
    calendarWidth: number;
    dialogBounds: BoundsLike;
    dialogClientWidth: number;
    dialogScrollLeft: number;
    dialogScrollTop: number;
    inputBounds: BoundsLike;
    inputHeight: number;
}

interface DialogCalendarPlacement {
    left: number;
    showOnTop: boolean;
    top: number;
}

interface DialogOffsets {
    left: number;
    top: number;
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

function dialogHost(host: HTMLElement): boolean {
    return host.tagName === "DIALOG";
}

function clampDialogLeft(args: {
    calendarWidth: number;
    dialogClientWidth: number;
    dialogScrollLeft: number;
    left: number;
}): number {
    const MIN_LEFT = args.dialogScrollLeft + POSITION_OFFSET;
    const MAX_LEFT =
        args.dialogScrollLeft +
        args.dialogClientWidth -
        args.calendarWidth -
        POSITION_OFFSET;
    if (MAX_LEFT <= MIN_LEFT) {
        return MIN_LEFT;
    }
    return Math.min(Math.max(args.left, MIN_LEFT), MAX_LEFT);
}

function dialogOffsets(args: DialogCalendarPlacementArgs): DialogOffsets {
    return {
        left:
            args.inputBounds.left -
            args.dialogBounds.left +
            args.dialogScrollLeft,
        top: args.inputBounds.top - args.dialogBounds.top + args.dialogScrollTop,
    };
}

function showCalendarOnTop(args: DialogCalendarPlacementArgs): boolean {
    const SPACE_ABOVE = args.inputBounds.top - args.dialogBounds.top;
    const SPACE_BELOW = args.dialogBounds.bottom - args.inputBounds.bottom;
    return SPACE_BELOW < args.calendarHeight && SPACE_ABOVE > args.calendarHeight;
}

function dialogCalendarTop(
    args: DialogCalendarPlacementArgs,
    offsetTop: number,
    showOnTop: boolean,
): number {
    if (showOnTop) {
        return offsetTop - args.calendarHeight - POSITION_OFFSET;
    }
    return offsetTop + args.inputHeight + POSITION_OFFSET;
}

function dialogCalendarPlacement(
    args: DialogCalendarPlacementArgs,
): DialogCalendarPlacement {
    const OFFSETS = dialogOffsets(args);
    const SHOW_ON_TOP = showCalendarOnTop(args);
    return {
        left: clampDialogLeft({
            calendarWidth: args.calendarWidth,
            dialogClientWidth: args.dialogClientWidth,
            dialogScrollLeft: args.dialogScrollLeft,
            left: OFFSETS.left,
        }),
        showOnTop: SHOW_ON_TOP,
        top: dialogCalendarTop(args, OFFSETS.top, SHOW_ON_TOP),
    };
}

function positionDialogCalendar(
    picker: Instance,
    host: HTMLElement,
    positionElement: HTMLElement,
): void {
    const CALENDAR = picker.calendarContainer;
    const PLACEMENT = dialogCalendarPlacement({
        calendarHeight: CALENDAR.offsetHeight,
        calendarWidth: CALENDAR.offsetWidth,
        dialogBounds: host.getBoundingClientRect(),
        dialogClientWidth: host.clientWidth,
        dialogScrollLeft: host.scrollLeft,
        dialogScrollTop: host.scrollTop,
        inputBounds: positionElement.getBoundingClientRect(),
        inputHeight: positionElement.offsetHeight,
    });
    CALENDAR.style.left = `${PLACEMENT.left}px`;
    CALENDAR.style.position = "absolute";
    CALENDAR.style.right = "auto";
    CALENDAR.style.top = `${PLACEMENT.top}px`;
}

function pickerPosition(args: StaticDatePickerArgs): Options["position"] {
    if (!dialogHost(args.host)) {
        return "auto left";
    }
    return (picker, customPositionElement): void => {
        positionDialogCalendar(
            picker,
            args.host,
            customPositionElement ?? args.positionElement,
        );
    };
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
        monthSelectorType: "dropdown",
        nextArrow: NEXT_MONTH_LABEL,
        position: pickerPosition(args),
        positionElement: args.positionElement,
        prevArrow: PREVIOUS_MONTH_LABEL,
        static: false,
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
