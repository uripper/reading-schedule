import type { FieldDefinition } from "../../types/types.ts";
import { el } from "../dom.ts";
import { DIFFICULTY_LEVEL_COUNT, WEEKDAYS } from "./config.ts";

type InputFieldDefinition = Extract<
    FieldDefinition,
    { type: "number" | "date" | "checkbox" }
>;
type SelectFieldDefinition = Extract<FieldDefinition, { type: "select" }>;

const INTEGER_STEP = "1";
const INTEGER_INPUT_INVALID_KEYS = new Set(["+", "-", ".", ",", "e", "E"]);
const WEEKDAY_MINUTES_MIN = "0";
const WEEKDAY_MINUTES_MAX = "1440";
const DIFFICULTY_STEP = "0.05";
const DIFFICULTY_MIN = "0.05";
const DIFFICULTY_MAX = "2";
const FIRST_DIFFICULTY_LEVEL = 1;

function hintDot(text?: string): HTMLSpanElement | null {
    const NORMALIZED_TEXT = String(text ?? "").trim();
    if (NORMALIZED_TEXT.length === 0) {
        return null;
    }
    const DOT = document.createElement("span");
    DOT.className = "hint-dot";
    DOT.tabIndex = 0;
    DOT.setAttribute("role", "note");
    DOT.dataset.tip = NORMALIZED_TEXT;
    DOT.textContent = "?";
    return DOT;
}

function isIntegerField(field: FieldDefinition): boolean {
    return field.type === "number" && field.step === INTEGER_STEP;
}

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

function finiteInputValue(rawValue: string): number | null {
    const VALUE = Number(rawValue);
    if (!Number.isFinite(VALUE)) {
        return null;
    }
    return VALUE;
}

function roundedInputValue(value: number, step: string): number {
    if (step !== INTEGER_STEP) {
        return value;
    }
    return Math.round(value);
}

function clampedMinValue(value: number, minValue: string): number {
    if (minValue === "") {
        return value;
    }
    const MINIMUM = Number(minValue);
    if (value < MINIMUM) {
        return MINIMUM;
    }
    return value;
}

function clampedMaxValue(value: number, maxValue: string): number {
    if (maxValue === "") {
        return value;
    }
    const MAXIMUM = Number(maxValue);
    if (value > MAXIMUM) {
        return MAXIMUM;
    }
    return value;
}

function clampedNumericValue(inputNode: HTMLInputElement): string | null {
    const RAW = inputNode.value.trim();
    if (RAW === "") {
        return null;
    }
    const VALUE = finiteInputValue(RAW);
    if (VALUE === null) {
        return "";
    }
    const ROUNDED = roundedInputValue(VALUE, inputNode.step);
    const MIN_CLAMPED = clampedMinValue(ROUNDED, inputNode.min);
    return String(clampedMaxValue(MIN_CLAMPED, inputNode.max));
}

function clampNumericInput(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    const VALUE = clampedNumericValue(INPUT_NODE);
    if (VALUE === null) {
        return;
    }
    INPUT_NODE.value = VALUE;
}

function preventInvalidIntegerKeys(event: KeyboardEvent): void {
    if (INTEGER_INPUT_INVALID_KEYS.has(event.key)) {
        event.preventDefault();
    }
}

function setNumericInputMode(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.inputMode = "numeric";
}

function bindIntegerInputConstraints(inputNode: HTMLInputElement): void {
    setNumericInputMode(inputNode);
    inputNode.addEventListener("keydown", preventInvalidIntegerKeys);
    inputNode.addEventListener("input", () => {
        sanitizeIntegerInput(inputNode);
    });
}

function normalizeNumericInput(
    inputNode: HTMLInputElement,
    field: FieldDefinition,
): void {
    if (isIntegerField(field)) {
        sanitizeIntegerInput(inputNode);
    }
    clampNumericInput(inputNode);
}

function bindNumericNormalization(
    inputNode: HTMLInputElement,
    field: FieldDefinition,
): void {
    inputNode.addEventListener("blur", () => {
        normalizeNumericInput(inputNode, field);
    });
    inputNode.addEventListener("change", () => {
        normalizeNumericInput(inputNode, field);
    });
}

function bindNumberConstraints(
    inputNode: HTMLInputElement,
    field: FieldDefinition,
): void {
    if (field.type !== "number") {
        return;
    }
    if (isIntegerField(field)) {
        bindIntegerInputConstraints(inputNode);
    }
    bindNumericNormalization(inputNode, field);
}

function applyWeekdayMinuteBounds(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.type = "number";
    INPUT_NODE.min = WEEKDAY_MINUTES_MIN;
    INPUT_NODE.max = WEEKDAY_MINUTES_MAX;
    INPUT_NODE.step = INTEGER_STEP;
}

function bindWeekdayMinuteNormalization(inputNode: HTMLInputElement): void {
    inputNode.addEventListener("blur", () => {
        clampNumericInput(inputNode);
    });
    inputNode.addEventListener("change", () => {
        clampNumericInput(inputNode);
    });
}

function createWeekdayMinutesInput(key: string): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = `minutes_${key}`;
    applyWeekdayMinuteBounds(INPUT_NODE);
    bindIntegerInputConstraints(INPUT_NODE);
    bindWeekdayMinuteNormalization(INPUT_NODE);
    return INPUT_NODE;
}

function appendHint(label: HTMLLabelElement, hint?: string): void {
    const DOT = hintDot(hint);
    if (DOT !== null) {
        label.append(" ", DOT);
    }
}

function createFieldLabel(field: FieldDefinition): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.append(field.label);
    return LABEL;
}

function appendSelectOptions(
    selectNode: HTMLSelectElement,
    options: SelectFieldDefinition["options"],
): void {
    for (const OPTION of options) {
        const OPTION_NODE = document.createElement("option");
        OPTION_NODE.value = String(OPTION.value);
        OPTION_NODE.textContent = String(OPTION.label);
        selectNode.append(OPTION_NODE);
    }
}

function createSelectFieldInput(
    field: SelectFieldDefinition,
): HTMLSelectElement {
    const SELECT_NODE = document.createElement("select");
    appendSelectOptions(SELECT_NODE, field.options);
    return SELECT_NODE;
}

function applyFieldRange(
    inputNode: HTMLInputElement,
    field: InputFieldDefinition,
): void {
    const INPUT_NODE = inputNode;
    if (typeof field.min === "number") {
        INPUT_NODE.min = String(field.min);
    }
    if (typeof field.max === "number") {
        INPUT_NODE.max = String(field.max);
    }
}

function applyFieldStep(
    inputNode: HTMLInputElement,
    field: InputFieldDefinition,
): void {
    const INPUT_NODE = inputNode;
    if (typeof field.step === "string" && field.step.length > 0) {
        INPUT_NODE.step = field.step;
    }
}

function applyCheckboxFieldStyle(
    label: HTMLLabelElement,
    field: InputFieldDefinition,
): void {
    if (field.type === "checkbox") {
        label.classList.add("toggle-row");
    }
}

function createInputFieldInput(
    field: InputFieldDefinition,
    label: HTMLLabelElement,
): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.type = field.type;
    applyFieldStep(INPUT_NODE, field);
    applyFieldRange(INPUT_NODE, field);
    bindNumberConstraints(INPUT_NODE, field);
    applyCheckboxFieldStyle(label, field);
    return INPUT_NODE;
}

function createFieldInputNode(
    field: FieldDefinition,
    label: HTMLLabelElement,
): HTMLInputElement | HTMLSelectElement {
    if (field.type === "select") {
        return createSelectFieldInput(field);
    }
    return createInputFieldInput(field, label);
}

function appendFieldInput(
    label: HTMLLabelElement,
    inputNode: HTMLInputElement | HTMLSelectElement,
    fieldId: string,
): HTMLLabelElement {
    const INPUT_NODE = inputNode;
    INPUT_NODE.id = fieldId;
    label.append(INPUT_NODE);
    return label;
}

function renderFieldInput(field: FieldDefinition): HTMLLabelElement {
    const LABEL = createFieldLabel(field);
    appendHint(LABEL, field.hint);
    const INPUT_NODE = createFieldInputNode(field, LABEL);
    return appendFieldInput(LABEL, INPUT_NODE, field.id);
}

export function renderGrid(
    id: string,
    fieldDefinitions: FieldDefinition[],
): void {
    el(id).replaceChildren(...fieldDefinitions.map(renderFieldInput));
}

function weekdayMinutesLabel([
    key,
    name,
]: (typeof WEEKDAYS)[number]): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.append(`${name} minutes`);
    LABEL.append(createWeekdayMinutesInput(key));
    return LABEL;
}

export function renderWeekdayGrid(): void {
    el("weekdayGrid").replaceChildren(...WEEKDAYS.map(weekdayMinutesLabel));
}

function createDifficultyInput(level: number): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = `diff_${level}`;
    INPUT_NODE.type = "number";
    INPUT_NODE.step = DIFFICULTY_STEP;
    INPUT_NODE.min = DIFFICULTY_MIN;
    INPUT_NODE.max = DIFFICULTY_MAX;
    return INPUT_NODE;
}

function createDifficultyRow(level: number): HTMLTableRowElement {
    const ROW = document.createElement("tr");
    const LABEL_CELL = document.createElement("td");
    LABEL_CELL.textContent = String(level);
    const INPUT_CELL = document.createElement("td");
    INPUT_CELL.append(createDifficultyInput(level));
    ROW.append(LABEL_CELL, INPUT_CELL);
    return ROW;
}

export function renderDifficultyRows(): void {
    const DIFF_ROWS = Array.from(
        { length: DIFFICULTY_LEVEL_COUNT },
        (_value, index) => createDifficultyRow(index + FIRST_DIFFICULTY_LEVEL),
    );
    el("difficultyBody").replaceChildren(...DIFF_ROWS);
}
