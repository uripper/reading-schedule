import { FIELDS as CONFIG_FIELDS } from "./config_fields.ts";

export const FIELDS = CONFIG_FIELDS;

export const WEEKDAYS: [string, string][] = [
    ["Mon", "Monday"],
    ["Tue", "Tuesday"],
    ["Wed", "Wednesday"],
    ["Thu", "Thursday"],
    ["Fri", "Friday"],
    ["Sat", "Saturday"],
    ["Sun", "Sunday"],
];

export function weekdayMinutesEnabledId(key: string): string {
    return `minutes_${key}_enabled`;
}

export function weekdayMinutesInputId(key: string): string {
    return `minutes_${key}`;
}
