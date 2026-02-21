import { el } from "../dom.js";
import { DIFFICULTY_LEVEL_COUNT, weekdays } from "./config.js";
import type { FieldDefinition } from "./config.js";

function hintDot(text?: string): HTMLSpanElement | null {
  if (!text) {
    return null;
  }
  const dot = document.createElement("span");
  dot.className = "hint-dot";
  dot.tabIndex = 0;
  dot.setAttribute("role", "note");
  dot.dataset.tip = String(text);
  dot.textContent = "?";
  return dot;
}

function renderFieldInput(field: FieldDefinition): HTMLLabelElement {
  const label = document.createElement("label");
  label.append(field.label);

  const dot = hintDot(field.hint);
  if (dot) {
    label.append(" ", dot);
  }

  let node: HTMLInputElement | HTMLSelectElement;
  if (field.type === "select") {
    node = document.createElement("select");
    (field.options || []).forEach((option) => {
      const optionNode = document.createElement("option");
      optionNode.value = String(option.value);
      optionNode.textContent = String(option.label);
      node.append(optionNode);
    });
  } else {
    node = document.createElement("input");
    node.type = field.type || "number";
    if (field.step) {
      node.step = field.step;
    }
  }

  node.id = field.id;
  label.append(node);
  return label;
}

export function renderGrid(
  id: string,
  fieldDefinitions: FieldDefinition[],
): void {
  el(id).replaceChildren(
    ...fieldDefinitions.map(renderFieldInput),
  );
}

export function renderWeekdayGrid() {
  const weekdayNodes = weekdays.map(([key, name]) => {
    const label = document.createElement("label");
    label.append(`${name} minutes`);

    const inputNode = document.createElement("input");
    inputNode.id = `minutes_${key}`;
    inputNode.type = "number";
    label.append(inputNode);

    return label;
  });
  el("weekdayGrid").replaceChildren(...weekdayNodes);
}

export function renderDifficultyRows() {
  const diffRows = Array.from(
    { length: DIFFICULTY_LEVEL_COUNT },
    (_, index) => {
      const row = document.createElement("tr");
      const level = index + 1;

      const labelCell = document.createElement("td");
      labelCell.textContent = String(level);

      const inputCell = document.createElement("td");
      const inputNode = document.createElement("input");
      inputNode.id = `diff_${level}`;
      inputNode.type = "number";
      inputNode.step = "0.05";
      inputNode.min = "0.05";
      inputNode.max = "2";
      inputCell.append(inputNode);

      row.append(labelCell, inputCell);
      return row;
    },
  );

  el("difficultyBody").replaceChildren(...diffRows);
}
