import type {
    Book,
    BookFormRefs,
    BookInput,
    BookWeekday,
    BulkBookSubmitPayload,
} from "../../types/types.ts";
import { readScheduledDaySelection } from "./form_scheduled_days.ts";
import {
    DEFAULT_DIFFICULTY,
    DEFAULT_PRIORITY,
    DEFAULT_PROGRESS,
} from "./form-state-helpers.ts";
import { toOptionalInt } from "./utils.ts";

const BULK_DIRTY = "bulkDirty";
const DIRTY_VALUE = "true";

function markDirty(element: HTMLElement): void {
    const TARGET = element;
    TARGET.dataset[BULK_DIRTY] = DIRTY_VALUE;
}

function isDirty(element: HTMLElement): boolean {
    return element.dataset[BULK_DIRTY] === DIRTY_VALUE;
}

function bindDirtyInput(input: HTMLInputElement | HTMLSelectElement): void {
    input.addEventListener("input", () => {
        markDirty(input);
    });
    input.addEventListener("change", () => {
        markDirty(input);
    });
}

function bindScheduledDaysDirty(refs: BookFormRefs): void {
    refs.scheduledDaysField.addEventListener("change", () => {
        markDirty(refs.scheduledDaysField);
    });
}

function selectedDaysUpdate(refs: BookFormRefs): BookWeekday[] {
    const DAYS = readScheduledDaySelection(refs);
    if (DAYS.length === 0) {
        throw new Error("Select at least one scheduled day.");
    }
    return DAYS;
}

function textUpdates(refs: BookFormRefs): BookInput {
    const UPDATES: BookInput = {};
    if (isDirty(refs.author)) {
        UPDATES.author = refs.author.value.trim();
    }
    if (isDirty(refs.afterBookInput) || isDirty(refs.blockedByInput)) {
        UPDATES.blocked_by = refs.blockedByInput.value.trim() || null;
    }
    return UPDATES;
}

function numericUpdates(refs: BookFormRefs): BookInput {
    const UPDATES: BookInput = {};
    if (isDirty(refs.wordsInput)) {
        UPDATES.words_total = toOptionalInt(refs.wordsInput.value);
    }
    if (isDirty(refs.pagesTotalInput)) {
        UPDATES.pages_total = toOptionalInt(refs.pagesTotalInput.value);
    }
    if (isDirty(refs.pagesReadInput)) {
        UPDATES.pages_read = toOptionalInt(refs.pagesReadInput.value);
    }
    if (isDirty(refs.progressInput)) {
        UPDATES.progress_percent = Number(
            refs.progressInput.value || DEFAULT_PROGRESS,
        );
    }
    return UPDATES;
}

function planningUpdates(refs: BookFormRefs): BookInput {
    const UPDATES: BookInput = {};
    if (isDirty(refs.priorityInput)) {
        UPDATES.priority = Number(refs.priorityInput.value || DEFAULT_PRIORITY);
    }
    if (isDirty(refs.difficultyInput)) {
        UPDATES.difficulty = Number(
            refs.difficultyInput.value || DEFAULT_DIFFICULTY,
        );
    }
    if (isDirty(refs.maxMinutesInput)) {
        UPDATES.max_minutes_per_day = toOptionalInt(refs.maxMinutesInput.value);
    }
    return UPDATES;
}

function dateUpdates(refs: BookFormRefs): BookInput {
    const UPDATES: BookInput = {};
    if (isDirty(refs.deadlineInput)) {
        UPDATES.deadline = refs.deadlineInput.value.trim() || null;
    }
    if (isDirty(refs.finishedAtInput)) {
        UPDATES.finished_at = refs.finishedAtInput.value.trim() || null;
    }
    return UPDATES;
}

function selectUpdates(refs: BookFormRefs): BookInput {
    const UPDATES: BookInput = {};
    if (isDirty(refs.statusSelectInput)) {
        UPDATES.status = refs.statusSelectInput.value as Book["status"];
    }
    if (isDirty(refs.shelfSelectInput)) {
        UPDATES.shelf = refs.shelfSelectInput.value;
    }
    if (isDirty(refs.scheduledDaysField)) {
        UPDATES.scheduled_days = selectedDaysUpdate(refs);
    }
    return UPDATES;
}

export function bindBulkEditDirtyTracking(refs: BookFormRefs): void {
    bindDirtyInput(refs.author);
    bindDirtyInput(refs.wordsInput);
    bindDirtyInput(refs.pagesTotalInput);
    bindDirtyInput(refs.pagesReadInput);
    bindDirtyInput(refs.progressInput);
    bindDirtyInput(refs.priorityInput);
    bindDirtyInput(refs.difficultyInput);
    bindDirtyInput(refs.maxMinutesInput);
    bindDirtyInput(refs.deadlineInput);
    bindDirtyInput(refs.afterBookInput);
    bindDirtyInput(refs.blockedByInput);
    bindDirtyInput(refs.statusSelectInput);
    bindDirtyInput(refs.finishedAtInput);
    bindDirtyInput(refs.shelfSelectInput);
    bindScheduledDaysDirty(refs);
}

export function createBulkBookSubmitPayload(
    refs: BookFormRefs,
    bookIds: string[],
): BulkBookSubmitPayload {
    const UPDATES: BookInput = {
        ...textUpdates(refs),
        ...numericUpdates(refs),
        ...planningUpdates(refs),
        ...dateUpdates(refs),
        ...selectUpdates(refs),
    };
    return { bookIds, type: "bulk_books", updates: UPDATES };
}
