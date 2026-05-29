/**
 * Expands day-off date picker text into planner day keys.
 */
import { dayKeyFromDate } from "../app/date_keys.ts";
import { isValidDayKey } from "../app/day_keys_compare.ts";

const DATE_PART_COUNT = 3;
const DAY_INDEX = 2;
const MAX_DAY_OFF_RANGE_DAYS = 366;
const MONTH_INDEX = 1;
const MONTH_INDEX_OFFSET = 1;
const RANGE_PART_COUNT = 2;
const RANGE_SEPARATOR = " to ";
const SINGLE_DATE_PART_COUNT = 1;
const YEAR_INDEX = 0;

function localDateFromDayKey(dayKey: string): Date | null {
    if (!isValidDayKey(dayKey)) {
        return null;
    }
    const PARTS = dayKey.split("-");
    if (PARTS.length !== DATE_PART_COUNT) {
        return null;
    }
    return new Date(
        Number(PARTS[YEAR_INDEX]),
        Number(PARTS[MONTH_INDEX]) - MONTH_INDEX_OFFSET,
        Number(PARTS[DAY_INDEX]),
    );
}

function nextCalendarDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function orderedRangeBounds(left: Date, right: Date): [Date, Date] {
    if (left.getTime() <= right.getTime()) {
        return [left, right];
    }
    return [right, left];
}

function datesInRange(startDay: string, endDay: string): string[] {
    const START = localDateFromDayKey(startDay);
    const END = localDateFromDayKey(endDay);
    if (START === null || END === null) {
        return [];
    }
    const [FIRST, LAST] = orderedRangeBounds(START, END);
    return dayKeysBetween(FIRST, LAST);
}

function dayKeysBetween(start: Date, end: Date): string[] {
    const DAYS: string[] = [];
    let current = start;
    while (current.getTime() <= end.getTime()) {
        if (DAYS.length >= MAX_DAY_OFF_RANGE_DAYS) {
            return [];
        }
        DAYS.push(dayKeyFromDate(current));
        current = nextCalendarDate(current);
    }
    return DAYS;
}

function selectionParts(value: string): string[] {
    return value
        .trim()
        .split(RANGE_SEPARATOR)
        .map((part) => part.trim())
        .filter((part) => part !== "");
}

/**
 * Expands a single date or flatpickr range into unique day keys.
 * @param value - Date picker text such as `2026-05-30` or a range.
 * @returns Planner-ready day keys, or an empty array when invalid.
 */
export function dayOffDatesFromInput(value: string): string[] {
    const PARTS = selectionParts(value);
    const FIRST_PART = PARTS[0];
    if (
        PARTS.length === SINGLE_DATE_PART_COUNT &&
        FIRST_PART !== undefined &&
        isValidDayKey(FIRST_PART)
    ) {
        return [FIRST_PART];
    }
    if (PARTS.length !== RANGE_PART_COUNT) {
        return [];
    }
    const SECOND_PART = PARTS[1];
    if (FIRST_PART === undefined || SECOND_PART === undefined) {
        return [];
    }
    return datesInRange(FIRST_PART, SECOND_PART);
}
