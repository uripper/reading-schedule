// @ts-nocheck
import { el } from "./dom.js";

const PLAN_MODE_OPTIONS = [
  { value: "finish_soon", label: "Finish ASAP" },
  { value: "spread_out", label: "Spread Across Window" },
];

const fields = {
  window: [
    { id: "start_date", label: "Start date", type: "date" },
    { id: "end_date", label: "End date", type: "date" },
  ],
  budget: [
    {
      id: "plan_mode",
      label: "Plan behavior",
      type: "select",
      hint: "Choose whether Bartleby front-loads reading or spreads it across the full window.",
      options: PLAN_MODE_OPTIONS,
    },
    {
      id: "minutes_per_day",
      label: "Default reading minutes per day",
      hint: "Fallback if weekday minutes are not set.",
    },
    { id: "wpm_base", label: "Base reading speed (words/minute)" },
    {
      id: "time_quantum_minutes",
      label: "Planning block size (minutes)",
      hint: "Smallest scheduling chunk the planner uses.",
    },
    { id: "max_sessions_per_day", label: "Maximum sessions per day" },
    { id: "max_books_per_day", label: "Maximum different books per day" },
    {
      id: "max_blocks_per_book_per_day",
      label: "Maximum blocks per book per day",
      hint: "Prevents one book from taking the full day.",
    },
  ],
  weights: [
    {
      id: "w_finish",
      label: "Finish reward",
      hint: "Higher means finishing books is prioritized.",
      step: "0.1",
    },
    {
      id: "w_priority",
      label: "Priority weight",
      hint: "Lower means books get more time.",
      step: "0.1",
    },
    {
      id: "w_switch",
      label: "Switch penalty",
      hint: "Higher means fewer book switches per day.",
      step: "0.1",
    },
    {
      id: "w_smooth",
      label: "Difficulty smoothing",
      hint: "Higher means steadier day-to-day reading load.",
      step: "0.1",
    },
  ],
};

const weekdays = [
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
  ["Sun", "Sunday"],
];

let dayOffs = [];

function hintDot(text) {
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

function input(field) {
  const label = document.createElement("label");
  label.append(field.label);
  const dot = hintDot(field.hint);
  if (dot) {
    label.append(" ", dot);
  }

  let node;
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

function renderGrid(id, defs) {
  el(id).replaceChildren(...defs.map(input));
}

function renderDayOffs() {
  const list = el("dayOffList");
  const buttons = dayOffs.map((day) => {
    const button = document.createElement("button");
    button.className = "chip-btn";
    button.type = "button";
    button.dataset.day = day;
    button.textContent = `${day} x`;
    button.onclick = () => {
      dayOffs = dayOffs.filter((value) => value !== day);
      renderDayOffs();
    };
    return button;
  });
  list.replaceChildren(...buttons);
}

function renderWeekdayGrid() {
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

function renderDifficultyRows() {
  const diffRows = Array.from({ length: 10 }, (_, i) => {
    const row = document.createElement("tr");
    const level = i + 1;
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
  });
  el("difficultyBody").replaceChildren(...diffRows);
}

function bindDayOffAddButton() {
  el("addDayOffBtn").onclick = () => {
    const selectedDay = el("dayOffPicker").value;
    if (!selectedDay || dayOffs.includes(selectedDay)) {
      return;
    }
    dayOffs = [...dayOffs, selectedDay].sort();
    renderDayOffs();
  };
}

export function initSettingsGrid() {
  renderGrid("windowGrid", fields.window);
  renderGrid("budgetGrid", fields.budget);
  renderGrid("weightsGrid", fields.weights);
  renderWeekdayGrid();
  renderDifficultyRows();
  bindDayOffAddButton();
}

export function fillSettings(settings) {
  Object.values(fields)
    .flat()
    .forEach((field) => {
      const value = settings?.[field.id];
      if (field.type === "select") {
        el(field.id).value = value ?? "finish_soon";
        return;
      }
      el(field.id).value = value ?? "";
    });

  weekdays.forEach(([key]) => {
    el(`minutes_${key}`).value = settings?.minutes_by_weekday?.[key] ?? 0;
  });

  dayOffs = [...(settings?.days_off || [])].sort();
  renderDayOffs();

  Array.from({ length: 10 }, (_, i) => i + 1).forEach((level) => {
    const id = `diff_${level}`;
    el(id).value =
      settings?.difficulty_multiplier?.[level] ??
      settings?.difficulty_multiplier?.[String(level)] ??
      1;
  });
}

export function collectSettings() {
  const out = {};

  Object.values(fields)
    .flat()
    .forEach((field) => {
      const raw = el(field.id).value.trim();
      if (field.type === "date" || field.type === "select") {
        out[field.id] = raw;
        return;
      }
      out[field.id] = Number(raw || 0);
    });

  out.minutes_per_day = null;
  if (el("minutes_per_day").value.trim()) {
    out.minutes_per_day = Number(el("minutes_per_day").value);
  }
  out.minutes_by_weekday = Object.fromEntries(
    weekdays.map(([key]) => [key, Number(el(`minutes_${key}`).value || 0)]),
  );
  out.days_off = [...dayOffs];
  out.difficulty_multiplier = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [String(i + 1), Number(el(`diff_${i + 1}`).value || 1)]),
  );

  return out;
}
