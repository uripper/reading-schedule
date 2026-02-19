

const PLAN_MODE_OPTIONS = [
  { value: "finish_soon", label: "Finish ASAP" },
  { value: "spread_out", label: "Spread Across Window" },
];

export const fields = {
  window: [
    { id: "end_date", label: "Plan until date", type: "date" },
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

export const weekdays = [
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
  ["Sun", "Sunday"],
];

export const DIFFICULTY_LEVEL_COUNT = 10;
export const DEFAULT_PLAN_MODE = "finish_soon";
export const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
