import type {
  FieldDefinition,
  FieldGroupName,
  SelectOption,
} from "../../types/types_experience.js";

const PLAN_MODE_OPTIONS: SelectOption[] = [
  { value: "finish_soon", label: "Finish ASAP" },
  { value: "spread_out", label: "Spread Across Window" },
];

export const fields: Record<FieldGroupName, FieldDefinition[]> = {
  window: [{ id: "end_date", label: "Plan until date", type: "date" }],
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
      type: "number",
      hint: "Fallback if weekday minutes are not set.",
    },
    {
      id: "wpm_base",
      label: "Base reading speed (words/minute)",
      type: "number",
    },
    {
      id: "time_quantum_minutes",
      label: "Planning block size (minutes)",
      type: "number",
      hint: "Smallest scheduling chunk the planner uses.",
    },
    {
      id: "max_sessions_per_day",
      label: "Maximum sessions per day",
      type: "number",
    },
    {
      id: "max_books_per_day",
      label: "Maximum different books per day",
      type: "number",
    },
    {
      id: "max_blocks_per_book_per_day",
      label: "Maximum blocks per book per day",
      type: "number",
      hint: "Prevents one book from taking the full day.",
    },
  ],
  weights: [
    {
      id: "w_finish",
      label: "Finish reward",
      type: "number",
      hint: "Higher means finishing books is prioritized.",
      step: "0.1",
    },
    {
      id: "w_priority",
      label: "Priority weight",
      type: "number",
      hint: "Lower means books get more time.",
      step: "0.1",
    },
    {
      id: "w_switch",
      label: "Switch penalty",
      type: "number",
      hint: "Higher means fewer book switches per day.",
      step: "0.1",
    },
    {
      id: "w_smooth",
      label: "Difficulty smoothing",
      type: "number",
      hint: "Higher means steadier day-to-day reading load.",
      step: "0.1",
    },
  ],
  display: [
    {
      id: "books_show_word_count",
      label: "Show word counts in Books cards",
      type: "checkbox",
      hint: "Toggles the words/estimate row shown under reading progress.",
    },
    {
      id: "books_show_blocker_meta",
      label: "Show blocker metadata (After: ...)",
      type: "checkbox",
      hint: "Shows or hides the dependency note for blocked books.",
    },
    {
      id: "books_show_shelf_meta",
      label: "Show shelf metadata (Shelf: ...)",
      type: "checkbox",
      hint: "Shows or hides each book's shelf label in card metadata.",
    },
  ],
};
