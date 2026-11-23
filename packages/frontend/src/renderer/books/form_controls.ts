/**
 * Book form controls layered over plain inputs, which stay the stored value:
 * the priority segmented control writes a hidden input, the difficulty
 * stepper steps a number input, and the estimated-words field shows thousands
 * separators while saving a plain integer.
 */
import type { BookFormRefs } from "../../types/types.ts";

import { formatWordsInput } from "./word_count.ts";

const PRESSED_ATTR = "aria-pressed";
const PRIORITY_SEGMENTS_ID = "bookPrioritySegments";
const DIFFICULTY_STEPPER_ID = "bookDifficultyStepper";
const STEP_SELECTOR = "[data-step]";
/**
 * Tells listeners, such as mass-edit dirty tracking, that a value changed.
 * @param input - Input whose value was set by a control.
 */
function dispatchValueChange(input: HTMLInputElement): void {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Presses the priority segment matching the stored value.
 * @param refs - Book form references.
 */
function syncPrioritySegments(refs: BookFormRefs): void {
    const GROUP = document.getElementById(PRIORITY_SEGMENTS_ID);
    for (const BUTTON of GROUP?.querySelectorAll("button") ?? []) {
        const PRESSED = BUTTON.value === refs.priorityInput.value;
        BUTTON.setAttribute(PRESSED_ATTR, String(PRESSED));
    }
}

/**
 * Disables the stepper buttons at the ends of the range.
 * @param refs - Book form references.
 */
function syncDifficultyStepper(refs: BookFormRefs): void {
    const INPUT = refs.difficultyInput;
    const STEPPER = document.getElementById(DIFFICULTY_STEPPER_ID);
    const VALUE = Number(INPUT.value);
    for (const BUTTON of STEPPER?.querySelectorAll<HTMLButtonElement>(
        STEP_SELECTOR,
    ) ?? []) {
        let limit = Number(INPUT.max);
        if (Number(BUTTON.dataset.step) < 0) {
            limit = Number(INPUT.min);
        }
        BUTTON.disabled = INPUT.value !== "" && VALUE === limit;
    }
}

/**
 * Brings every layered control in line with its input after a fill.
 * @param refs - Book form references.
 */
export function syncBookFormControls(refs: BookFormRefs): void {
    syncPrioritySegments(refs);
    syncDifficultyStepper(refs);
    formatWordsInput(refs.wordsInput);
}

/**
 * Binds the priority segmented control.
 * @param refs - Book form references.
 */
function bindPrioritySegments(refs: BookFormRefs): void {
    document
        .getElementById(PRIORITY_SEGMENTS_ID)
        ?.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }
            const BUTTON = event.target.closest("button");
            if (BUTTON === null) {
                return;
            }
            const INPUT = refs.priorityInput;
            INPUT.value = BUTTON.value;
            dispatchValueChange(INPUT);
            syncPrioritySegments(refs);
        });
}

/**
 * Steps the difficulty value, starting from the minimum when blank.
 * @param input - Difficulty input.
 * @param step - `1` or `-1`.
 */
function stepDifficulty(input: HTMLInputElement, step: number): void {
    const FIELD = input;
    if (FIELD.value === "") {
        FIELD.value = FIELD.min;
    } else if (step > 0) {
        FIELD.stepUp();
    } else {
        FIELD.stepDown();
    }
    dispatchValueChange(FIELD);
}

/**
 * Binds the difficulty stepper buttons and keeps their limits current.
 * @param refs - Book form references.
 */
function bindDifficultyStepper(refs: BookFormRefs): void {
    const STEPPER = document.getElementById(DIFFICULTY_STEPPER_ID);
    STEPPER?.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const BUTTON = event.target.closest<HTMLElement>(STEP_SELECTOR);
        if (BUTTON !== null) {
            stepDifficulty(refs.difficultyInput, Number(BUTTON.dataset.step));
        }
    });
    refs.difficultyInput.addEventListener("input", () => {
        syncDifficultyStepper(refs);
    });
}

/**
 * Binds every layered book form control.
 * @param refs - Book form references.
 */
export function bindBookFormControls(refs: BookFormRefs): void {
    bindPrioritySegments(refs);
    bindDifficultyStepper(refs);
    refs.wordsInput.addEventListener("blur", () => {
        formatWordsInput(refs.wordsInput);
    });
}
