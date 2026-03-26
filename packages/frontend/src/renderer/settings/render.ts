/**
 * Renders the desktop settings form controls from field metadata so the
 * settings screen and its numeric constraints stay in one place.
 */
import type { FieldDefinition } from "../../types/types.ts";
import { el } from "../dom.ts";
import { DIFFICULTY_LEVEL_COUNT, WEEKDAYS } from "./config.ts";

/** Narrows generic settings fields to input-backed controls. */
type InputFieldDefinition = Extract<
    FieldDefinition,
    { type: "number" | "date" | "checkbox" }
>;
/** Narrows generic settings fields to select-backed controls. */
type SelectFieldDefinition = Extract<FieldDefinition, { type: "select" }>;

/** String form of an integer step for numeric inputs that should reject decimals. */
const INTEGER_STEP = "1";
/** Keys that browsers otherwise accept in `type="number"` inputs but this UI rejects. */
const INTEGER_INPUT_INVALID_KEYS = new Set(["+", "-", ".", ",", "e", "E"]);
/** Lower bound for per-weekday minute targets. */
const WEEKDAY_MINUTES_MIN = "0";
/** Upper bound for per-weekday minute targets. */
const WEEKDAY_MINUTES_MAX = "1440";
/** Step size for difficulty multipliers. */
const DIFFICULTY_STEP = "0.05";
/** Lower bound for difficulty multipliers. */
const DIFFICULTY_MIN = "0.05";
/** Upper bound for difficulty multipliers. */
const DIFFICULTY_MAX = "2";
/** Stored difficulty levels are one-indexed in the settings table. */
const FIRST_DIFFICULTY_LEVEL = 1;

/** Builds the small keyboard-focusable hint marker shown beside labeled fields. */
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

/** Returns whether a field expects whole-number input only. */
function isIntegerField(field: FieldDefinition): boolean {
    return field.type === "number" && field.step === INTEGER_STEP;
}

/** Keeps only the first run of digits entered into an integer-only field. */
function integerDigitsOnly(value: string): string {
    const MATCH = value.match(/\d+/);
    if (MATCH === null) {
        return "";
    }
    return MATCH[0];
}

/** Rewrites an integer field in place when the browser accepts disallowed characters. */
function sanitizeIntegerInput(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    const SANITIZED = integerDigitsOnly(INPUT_NODE.value);
    if (INPUT_NODE.value !== SANITIZED) {
        INPUT_NODE.value = SANITIZED;
    }
}

/** Parses a numeric input string and rejects `NaN` or infinity values. */
function finiteInputValue(rawValue: string): number | null {
    const VALUE = Number(rawValue);
    if (!Number.isFinite(VALUE)) {
        return null;
    }
    return VALUE;
}

/** Rounds integer-only fields after parsing while leaving decimal inputs untouched. */
function roundedInputValue(value: number, step: string): number {
    if (step !== INTEGER_STEP) {
        return value;
    }
    return Math.round(value);
}

/** Applies a configured minimum bound when the input declares one. */
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

/** Applies a configured maximum bound when the input declares one. */
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

/** Converts an input's current text to its normalized bounded string value. */
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

/** Writes the normalized bounded numeric value back to the input when present. */
function clampNumericInput(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    const VALUE = clampedNumericValue(INPUT_NODE);
    if (VALUE === null) {
        return;
    }
    INPUT_NODE.value = VALUE;
}

/** Stops browser number inputs from accepting scientific notation and sign keys. */
function preventInvalidIntegerKeys(event: KeyboardEvent): void {
    if (INTEGER_INPUT_INVALID_KEYS.has(event.key)) {
        event.preventDefault();
    }
}

/** Hints numeric keyboards on platforms that honor `inputMode`. */
function setNumericInputMode(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.inputMode = "numeric";
}

/** Binds key and input guards for integer-only settings fields. */
function bindIntegerInputConstraints(inputNode: HTMLInputElement): void {
    setNumericInputMode(inputNode);
    inputNode.addEventListener("keydown", preventInvalidIntegerKeys);
    inputNode.addEventListener("input", () => {
        sanitizeIntegerInput(inputNode);
    });
}

/** Applies the full numeric normalization pipeline for a field definition. */
function normalizeNumericInput(
    inputNode: HTMLInputElement,
    field: FieldDefinition,
): void {
    if (isIntegerField(field)) {
        sanitizeIntegerInput(inputNode);
    }
    clampNumericInput(inputNode);
}

/** Normalizes numeric values when the browser commits or blurs a field. */
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

/** Hooks numeric-specific behavior only for number fields. */
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

/** Applies the fixed bounds for weekday reading-minute inputs. */
function applyWeekdayMinuteBounds(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.type = "number";
    INPUT_NODE.min = WEEKDAY_MINUTES_MIN;
    INPUT_NODE.max = WEEKDAY_MINUTES_MAX;
    INPUT_NODE.step = INTEGER_STEP;
}

/** Re-clamps weekday minute fields after direct edits. */
function bindWeekdayMinuteNormalization(inputNode: HTMLInputElement): void {
    inputNode.addEventListener("blur", () => {
        clampNumericInput(inputNode);
    });
    inputNode.addEventListener("change", () => {
        clampNumericInput(inputNode);
    });
}

/** Creates a weekday minutes input with its id and numeric guards wired in. */
function createWeekdayMinutesInput(key: string): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = `minutes_${key}`;
    applyWeekdayMinuteBounds(INPUT_NODE);
    bindIntegerInputConstraints(INPUT_NODE);
    bindWeekdayMinuteNormalization(INPUT_NODE);
    return INPUT_NODE;
}

/** Adds a hint marker when the field definition includes one. */
function appendHint(label: HTMLLabelElement, hint?: string): void {
    const DOT = hintDot(hint);
    if (DOT !== null) {
        label.append(" ", DOT);
    }
}

/** Appends all configured select options to the created field node. */
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

/** Copies optional numeric bounds from field metadata to the input element. */
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

/** Copies an explicit input step value from field metadata when present. */
function applyFieldStep(
    inputNode: HTMLInputElement,
    field: InputFieldDefinition,
): void {
    const INPUT_NODE = inputNode;
    if (typeof field.step === "string" && field.step.length > 0) {
        INPUT_NODE.step = field.step;
    }
}

/** Builds the correct input element for non-select field definitions. */
function createInputFieldInput(
    field: InputFieldDefinition,
    label: HTMLLabelElement,
): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.type = field.type;
    applyFieldStep(INPUT_NODE, field);
    applyFieldRange(INPUT_NODE, field);
    bindNumberConstraints(INPUT_NODE, field);
    if (field.type === "checkbox") {
        label.classList.add("toggle-row");
    }
    return INPUT_NODE;
}

/** Creates the control node for a field while preserving label-specific styling. */
function createFieldInputNode(
    field: FieldDefinition,
    label: HTMLLabelElement,
): HTMLInputElement | HTMLSelectElement {
    if (field.type === "select") {
        const SELECT_NODE = document.createElement("select");
        appendSelectOptions(SELECT_NODE, field.options);
        return SELECT_NODE;
    }
    return createInputFieldInput(field, label);
}

/** Renders a single settings field label and its bound control node. */
function renderFieldInput(field: FieldDefinition): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.append(field.label);
    appendHint(LABEL, field.hint);
    const INPUT_NODE = createFieldInputNode(field, LABEL);
    INPUT_NODE.id = field.id;
    LABEL.append(INPUT_NODE);
    return LABEL;
}

/** Renders the metadata-driven settings grid into the requested container. */
export function renderGrid(
    id: string,
    fieldDefinitions: FieldDefinition[],
): void {
    el(id).replaceChildren(...fieldDefinitions.map(renderFieldInput));
}

/** Renders one weekday row that captures target reading minutes for that day. */
function weekdayMinutesLabel([
    key,
    name,
]: (typeof WEEKDAYS)[number]): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.append(`${name} minutes`);
    LABEL.append(createWeekdayMinutesInput(key));
    return LABEL;
}

/** Renders the weekday minutes grid used by the planner settings panel. */
export function renderWeekdayGrid(): void {
    el("weekdayGrid").replaceChildren(...WEEKDAYS.map(weekdayMinutesLabel));
}

/** Builds one table row pairing a difficulty level label with its input. */
function createDifficultyRow(level: number): HTMLTableRowElement {
    const ROW = document.createElement("tr");
    const LABEL_CELL = document.createElement("td");
    LABEL_CELL.textContent = String(level);
    const INPUT_CELL = document.createElement("td");
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = `diff_${level}`;
    INPUT_NODE.type = "number";
    INPUT_NODE.step = DIFFICULTY_STEP;
    INPUT_NODE.min = DIFFICULTY_MIN;
    INPUT_NODE.max = DIFFICULTY_MAX;
    INPUT_CELL.append(INPUT_NODE);
    ROW.append(LABEL_CELL, INPUT_CELL);
    return ROW;
}

/** Renders all configured difficulty rows into the difficulty table body. */
export function renderDifficultyRows(): void {
    const DIFF_ROWS = Array.from(
        { length: DIFFICULTY_LEVEL_COUNT },
        (_value, index) => createDifficultyRow(index + FIRST_DIFFICULTY_LEVEL),
    );
    el("difficultyBody").replaceChildren(...DIFF_ROWS);
}
