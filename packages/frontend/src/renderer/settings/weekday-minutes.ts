import { el } from "../dom.ts";
import {
    WEEKDAYS,
    weekdayMinutesEnabledId,
    weekdayMinutesInputId,
} from "./config.ts";

const INTEGER_STEP = "1";
const INTEGER_INPUT_INVALID_KEYS = new Set(["+", "-", ".", ",", "e", "E"]);
const WEEKDAY_MINUTES_MIN = "1";
const WEEKDAY_MINUTES_MAX = "1440";

function integerDigitsOnly(value: string): string {
    const MATCH = value.match(/\d+/);
    if (MATCH === null) {
        return "";
    }
    return MATCH[0];
}

function sanitizeIntegerInput(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    const SANITIZED = integerDigitsOnly(INPUT_NODE.value);
    if (INPUT_NODE.value !== SANITIZED) {
        INPUT_NODE.value = SANITIZED;
    }
}

function preventInvalidIntegerKeys(event: KeyboardEvent): void {
    if (INTEGER_INPUT_INVALID_KEYS.has(event.key)) {
        event.preventDefault();
    }
}

function clampNumericInput(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    const RAW = INPUT_NODE.value.trim();
    if (RAW === "") {
        return;
    }
    const VALUE = Math.round(Number(RAW));
    if (!Number.isFinite(VALUE)) {
        INPUT_NODE.value = "";
        return;
    }
    const MIN_CLAMPED = Math.max(Number(INPUT_NODE.min), VALUE);
    INPUT_NODE.value = String(Math.min(Number(INPUT_NODE.max), MIN_CLAMPED));
}

function applyWeekdayMinuteBounds(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.type = "number";
    INPUT_NODE.min = WEEKDAY_MINUTES_MIN;
    INPUT_NODE.max = WEEKDAY_MINUTES_MAX;
    INPUT_NODE.step = INTEGER_STEP;
    INPUT_NODE.inputMode = "numeric";
}

function bindWeekdayMinuteNormalization(inputNode: HTMLInputElement): void {
    inputNode.addEventListener("keydown", preventInvalidIntegerKeys);
    inputNode.addEventListener("input", () => {
        sanitizeIntegerInput(inputNode);
    });
    inputNode.addEventListener("blur", () => {
        clampNumericInput(inputNode);
    });
    inputNode.addEventListener("change", () => {
        clampNumericInput(inputNode);
    });
}

function setCustomMinuteState(
    checkboxNode: HTMLInputElement,
    inputNode: HTMLInputElement,
): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.disabled = !checkboxNode.checked;
    if (!checkboxNode.checked) {
        INPUT_NODE.value = "";
    }
}

function bindCustomMinuteToggle(
    checkboxNode: HTMLInputElement,
    inputNode: HTMLInputElement,
): void {
    checkboxNode.addEventListener("change", () => {
        setCustomMinuteState(checkboxNode, inputNode);
    });
    setCustomMinuteState(checkboxNode, inputNode);
}

function createCustomCheckbox(key: string): HTMLInputElement {
    const CHECKBOX = document.createElement("input");
    CHECKBOX.id = weekdayMinutesEnabledId(key);
    CHECKBOX.type = "checkbox";
    return CHECKBOX;
}

function createWeekdayMinutesInput(key: string): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = weekdayMinutesInputId(key);
    applyWeekdayMinuteBounds(INPUT_NODE);
    bindWeekdayMinuteNormalization(INPUT_NODE);
    return INPUT_NODE;
}

function weekdayTitle(name: string): HTMLSpanElement {
    const TITLE = document.createElement("span");
    TITLE.textContent = name;
    return TITLE;
}

function weekdayToggleLabel(
    name: string,
    checkboxNode: HTMLInputElement,
): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.className = "weekday-custom-toggle";
    LABEL.append(checkboxNode, weekdayTitle(name));
    return LABEL;
}

function weekdayMinutesRow([
    key,
    name,
]: (typeof WEEKDAYS)[number]): HTMLElement {
    const ROW = document.createElement("div");
    const CHECKBOX = createCustomCheckbox(key);
    const INPUT = createWeekdayMinutesInput(key);
    ROW.className = "weekday-custom-row";
    ROW.dataset.weekday = key;
    INPUT.setAttribute("aria-label", `${name} custom minutes`);
    bindCustomMinuteToggle(CHECKBOX, INPUT);
    ROW.append(weekdayToggleLabel(name, CHECKBOX), INPUT);
    return ROW;
}

/** Renders the weekday minutes grid used by the planner settings panel. */
export function renderWeekdayGrid(): void {
    el("weekdayGrid").replaceChildren(...WEEKDAYS.map(weekdayMinutesRow));
}
