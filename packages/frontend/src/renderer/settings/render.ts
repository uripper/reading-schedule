import type { FieldDefinition } from "../../types/types.ts";
import { el } from "../dom.ts";

type InputFieldDefinition = Extract<
    FieldDefinition,
    { type: "number" | "date" | "checkbox" }
>;
type SelectFieldDefinition = Extract<FieldDefinition, { type: "select" }>;

const INTEGER_STEP = "1";
const INTEGER_INPUT_INVALID_KEYS = new Set(["+", "-", ".", ",", "e", "E"]);
const READING_SPEED_FIELD_ID = "wpm_base";
const READING_SPEED_TEST_URL = "https://www.readinglength.com/wpm";

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
    const VALUE = Number(RAW);
    if (!Number.isFinite(VALUE)) {
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

function bindIntegerInputConstraints(inputNode: HTMLInputElement): void {
    const INPUT_NODE = inputNode;
    INPUT_NODE.inputMode = "numeric";
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

function appendHint(label: HTMLElement, hint?: string): void {
    const DOT = hintDot(hint);
    if (DOT !== null) {
        label.append(DOT);
    }
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

function createInputFieldInput(field: InputFieldDefinition): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.type = field.type;
    applyFieldStep(INPUT_NODE, field);
    applyFieldRange(INPUT_NODE, field);
    bindNumberConstraints(INPUT_NODE, field);
    return INPUT_NODE;
}

function createFieldInputNode(
    field: FieldDefinition,
): HTMLInputElement | HTMLSelectElement {
    if (field.type === "select") {
        const SELECT_NODE = document.createElement("select");
        appendSelectOptions(SELECT_NODE, field.options);
        return SELECT_NODE;
    }
    return createInputFieldInput(field);
}

function fieldLabelText(field: FieldDefinition): HTMLSpanElement {
    const TEXT = document.createElement("span");
    TEXT.textContent = field.label;
    return TEXT;
}

function readingSpeedLink(): HTMLAnchorElement {
    const LINK = document.createElement("a");
    LINK.className = "settings-field-link";
    LINK.rel = "noreferrer";
    LINK.target = "_blank";
    LINK.setAttribute("href", READING_SPEED_TEST_URL);
    LINK.textContent = "Test reading speed";
    return LINK;
}

function appendFieldLabelContents(
    label: HTMLLabelElement,
    field: FieldDefinition,
): void {
    const LABEL_ROW = document.createElement("span");
    LABEL_ROW.className = "settings-field-label-row";
    LABEL_ROW.append(fieldLabelText(field));
    appendHint(LABEL_ROW, field.hint);
    if (field.id === READING_SPEED_FIELD_ID) {
        LABEL_ROW.append(readingSpeedLink());
    }
    label.append(LABEL_ROW);
}

function fieldWrapper(field: FieldDefinition): HTMLElement {
    const WRAPPER = document.createElement("div");
    WRAPPER.className = "settings-field";
    WRAPPER.dataset.settingField = field.id;
    return WRAPPER;
}

function checkboxLabel(
    field: FieldDefinition,
    inputNode: HTMLInputElement,
): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.className = "settings-field-checkbox";
    LABEL.append(inputNode, fieldLabelText(field));
    appendHint(LABEL, field.hint);
    return LABEL;
}

function appendNonCheckboxField(
    wrapper: HTMLElement,
    field: FieldDefinition,
    inputNode: HTMLInputElement | HTMLSelectElement,
): void {
    const LABEL = document.createElement("label");
    LABEL.htmlFor = field.id;
    appendFieldLabelContents(LABEL, field);
    wrapper.append(LABEL, inputNode);
}

function renderFieldInput(field: FieldDefinition): HTMLElement {
    const WRAPPER = fieldWrapper(field);
    const INPUT_NODE = createFieldInputNode(field);
    INPUT_NODE.id = field.id;
    if (field.type === "checkbox" && INPUT_NODE instanceof HTMLInputElement) {
        WRAPPER.append(checkboxLabel(field, INPUT_NODE));
        return WRAPPER;
    }
    appendNonCheckboxField(WRAPPER, field, INPUT_NODE);
    return WRAPPER;
}

export function renderGrid(
    id: string,
    fieldDefinitions: FieldDefinition[],
): void {
    el(id).replaceChildren(...fieldDefinitions.map(renderFieldInput));
}
