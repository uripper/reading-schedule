import type { FieldDefinition } from "../../types/types.js";
import { el } from "../dom.js";
import { DIFFICULTY_LEVEL_COUNT, WEEKDAYS } from "./config.js";

const INTEGER_STEP = "1";
const INTEGER_INPUT_INVALID_KEYS = new Set(["+", "-", ".", ",", "e", "E"]);
const WEEKDAY_MINUTES_MIN = "0";
const WEEKDAY_MINUTES_MAX = "1440";

/**
 * Creates optional hint badge node for a field label.
 * @param text - Hint text.
 * @returns Hint node or null when hint is empty.
 */
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
    const SANITIZED = integerDigitsOnly(inputNode.value);
    if (inputNode.value !== SANITIZED) {
        inputNode.value = SANITIZED;
    }
}

function clampNumericInput(inputNode: HTMLInputElement): void {
    const RAW = inputNode.value.trim();
    if (RAW === "") {
        return;
    }
    let value = Number(RAW);
    if (!Number.isFinite(value)) {
        inputNode.value = "";
        return;
    }
    if (inputNode.step === INTEGER_STEP) {
        value = Math.round(value);
    }
    if (inputNode.min !== "") {
        const MIN = Number(inputNode.min);
        if (value < MIN) {
            value = MIN;
        }
    }
    if (inputNode.max !== "") {
        const MAX = Number(inputNode.max);
        if (value > MAX) {
            value = MAX;
        }
    }
    inputNode.value = String(value);
}

function bindIntegerInputConstraints(inputNode: HTMLInputElement): void {
    inputNode.inputMode = "numeric";
    inputNode.addEventListener("keydown", (event) => {
        if (INTEGER_INPUT_INVALID_KEYS.has(event.key)) {
            event.preventDefault();
        }
    });
    inputNode.addEventListener("input", () => {
        sanitizeIntegerInput(inputNode);
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
    inputNode.addEventListener("blur", () => {
        if (isIntegerField(field)) {
            sanitizeIntegerInput(inputNode);
        }
        clampNumericInput(inputNode);
    });
    inputNode.addEventListener("change", () => {
        if (isIntegerField(field)) {
            sanitizeIntegerInput(inputNode);
        }
        clampNumericInput(inputNode);
    });
}

function createWeekdayMinutesInput(key: string): HTMLInputElement {
    const INPUT_NODE = document.createElement("input");
    INPUT_NODE.id = `minutes_${key}`;
    INPUT_NODE.type = "number";
    INPUT_NODE.min = WEEKDAY_MINUTES_MIN;
    INPUT_NODE.max = WEEKDAY_MINUTES_MAX;
    INPUT_NODE.step = INTEGER_STEP;
    bindIntegerInputConstraints(INPUT_NODE);
    INPUT_NODE.addEventListener("blur", () => {
        clampNumericInput(INPUT_NODE);
    });
    INPUT_NODE.addEventListener("change", () => {
        clampNumericInput(INPUT_NODE);
    });
    return INPUT_NODE;
}

/**
 * Renders a settings field as a labeled input/select control.
 * @param field - Field definition.
 * @returns Label element containing field control.
 */
function renderFieldInput(field: FieldDefinition): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.append(field.label);

    const DOT = hintDot(field.hint);
    if (DOT) {
        LABEL.append(" ", DOT);
    }

    let node: HTMLInputElement | HTMLSelectElement;
    if (field.type === "select") {
        node = document.createElement("select");

        for (const OPTION of field.options) {
            const OPTION_NODE = document.createElement("option");
            OPTION_NODE.value = String(OPTION.value);
            OPTION_NODE.textContent = String(OPTION.label);
            node.append(OPTION_NODE);
        }
    } else {
        node = document.createElement("input");
        node.type = field.type;
        if (typeof field.step === "string" && field.step.length > 0) {
            node.step = field.step;
        }
        if (typeof field.min === "number") {
            node.min = String(field.min);
        }
        if (typeof field.max === "number") {
            node.max = String(field.max);
        }
        bindNumberConstraints(node, field);
        if (field.type === "checkbox") {
            LABEL.classList.add("toggle-row");
        }
    }

    node.id = field.id;
    LABEL.append(node);
    return LABEL;
}

/**
 * Renders a settings grid section from field definitions.
 * @param id - Target container id.
 * @param fieldDefinitions - Field definitions to render.
 */
export function renderGrid(
    id: string,
    fieldDefinitions: FieldDefinition[],
): void {
    el(id).replaceChildren(...fieldDefinitions.map(renderFieldInput));
}

/**
 * Renders weekday minutes input rows.
 */
export function renderWeekdayGrid(): void {
    const WEEKDAY_NODES = WEEKDAYS.map(([key, name]) => {
        const LABEL = document.createElement("label");
        LABEL.append(`${name} minutes`);
        LABEL.append(createWeekdayMinutesInput(key));
        return LABEL;
    });
    el("weekdayGrid").replaceChildren(...WEEKDAY_NODES);
}

/**
 * Renders difficulty multiplier table rows.
 */
export function renderDifficultyRows(): void {
    const DIFF_ROWS = Array.from(
        { length: DIFFICULTY_LEVEL_COUNT },
        (_, index) => {
            const ROW = document.createElement("tr");
            const LEVEL = index + 1;

            const LABEL_CELL = document.createElement("td");
            LABEL_CELL.textContent = String(LEVEL);

            const INPUT_CELL = document.createElement("td");
            const INPUT_NODE = document.createElement("input");
            INPUT_NODE.id = `diff_${LEVEL}`;
            INPUT_NODE.type = "number";
            INPUT_NODE.step = "0.05";
            INPUT_NODE.min = "0.05";
            INPUT_NODE.max = "2";
            INPUT_CELL.append(INPUT_NODE);

            ROW.append(LABEL_CELL, INPUT_CELL);
            return ROW;
        },
    );

    el("difficultyBody").replaceChildren(...DIFF_ROWS);
}
