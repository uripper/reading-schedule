import type {
    FieldDefinition,
    FieldGroupName,
} from "../../types/types.ts";

const PLAN_MODE_OPTIONS = [
    { label: "Finish ASAP", value: "finish_soon" },
    { label: "Spread Across Window", value: "spread_out" },
];

export const FIELDS: Record<FieldGroupName, FieldDefinition[]> = {
    budget: [
        {
            hint: "Choose whether Bartleby front-loads reading or spreads it across the full window.",
            id: "plan_mode",
            label: "Plan behavior",
            options: PLAN_MODE_OPTIONS,
            type: "select",
        },
        {
            hint: "Fallback if weekday minutes are not set.",
            id: "minutes_per_day",
            label: "Default reading minutes per day",
            max: 1440,
            min: 0,
            step: "1",
            type: "number",
        },
        {
            id: "wpm_base",
            label: "Base reading speed (words/minute)",
            max: 9999,
            min: 1,
            step: "1",
            type: "number",
        },
        {
            hint: "Smallest scheduling chunk the planner uses.",
            id: "time_quantum_minutes",
            label: "Planning block size (minutes)",
            max: 1440,
            min: 1,
            step: "1",
            type: "number",
        },
        {
            id: "max_sessions_per_day",
            label: "Maximum sessions per day",
            max: 9999,
            min: 1,
            pattern: "^[1-9]\\d*$",
            step: "1",
            type: "number",
        },
        {
            id: "max_books_per_day",
            label: "Maximum different books per day",
            max: 9999,
            min: 1,
            step: "1",
            type: "number",
        },
        {
            hint: "Prevents one book from taking the full day.",
            id: "max_blocks_per_book_per_day",
            label: "Maximum blocks per book per day",
            max: 9999,
            min: 1,
            step: "1",
            type: "number",
        },
    ],
    display: [
        {
            hint: "Toggles the words/estimate row shown under reading progress.",
            id: "books_show_word_count",
            label: "Show word counts in Books cards",
            type: "checkbox",
        },
        {
            hint: "Shows or hides the dependency note for blocked books.",
            id: "books_show_blocker_meta",
            label: "Show blocker metadata (After: ...)",
            type: "checkbox",
        },
        {
            hint: "Shows or hides each book's shelf label in card metadata.",
            id: "books_show_shelf_meta",
            label: "Show shelf metadata (Shelf: ...)",
            type: "checkbox",
        },
    ],
    weights: [
        {
            hint: "Higher means finishing books is prioritized.",
            id: "w_finish",
            label: "Finish reward",
            step: "0.1",
            type: "number",
        },
        {
            hint: "Lower means books get more time.",
            id: "w_priority",
            label: "Priority weight",
            step: "0.1",
            type: "number",
        },
        {
            hint: "Higher means fewer book switches per day.",
            id: "w_switch",
            label: "Switch penalty",
            step: "0.1",
            type: "number",
        },
        {
            hint: "Higher means steadier day-to-day reading load.",
            id: "w_smooth",
            label: "Difficulty smoothing",
            step: "0.1",
            type: "number",
        },
    ],
    window: [
        {
            id: "start_date",
            label: "Plan from date",
            type: "date",
        },
        { id: "end_date", label: "Plan until date", type: "date" },
    ],
};
