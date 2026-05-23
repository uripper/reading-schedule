import type { FieldDefinition, FieldGroupName } from "../../types/types.ts";

export const FIELDS: Record<FieldGroupName, FieldDefinition[]> = {
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
    minutes: [
        {
            id: "minutes_per_day",
            label: "Minutes per day",
            max: 1440,
            min: 1,
            step: "1",
            type: "number",
        },
    ],
    plan: [
        {
            id: "wpm_base",
            label: "Base reading speed (words/minute)",
            max: 9999,
            min: 1,
            step: "1",
            type: "number",
        },
        {
            id: "max_books_per_day",
            label: "Maximum books per day",
            max: 9999,
            min: 1,
            step: "1",
            type: "number",
        },
    ],
};
