import { type FieldDefinition } from "../../types/types.js";
import { el } from "../dom.js";
import { DIFFICULTY_LEVEL_COUNT, FIELDS } from "./config.js";

/**
 * Returns typed input element by id.
 * @param id Element id.
 * @returns Input element.
 */
export function inputEl(id: string): HTMLInputElement {
    return el<HTMLInputElement>(id);
}

/**
 * Returns typed select element by id.
 * @param id Element id.
 * @returns Select element.
 */
export function selectEl(id: string): HTMLSelectElement {
    return el<HTMLSelectElement>(id);
}

/**
 * Flattens all settings field definitions across sections.
 * @returns Field definition list.
 */
export function allFieldDefinitions(): FieldDefinition[] {
    return Object.values(FIELDS).flat();
}

/**
 * Returns difficulty level numbers used for multiplier rows.
 * @returns Sequential level numbers starting at 1.
 */
export function numberLevels(): number[] {
    return Array.from(
        { length: DIFFICULTY_LEVEL_COUNT },
        (_, index) => index + 1,
    );
}
