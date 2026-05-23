import type { FieldDefinition } from "../../types/types.ts";
import { el } from "../dom.ts";
import { FIELDS } from "./config.ts";

/**
 * Returns typed input element by id.
 * @param id - Element id.
 * @returns Input element.
 */
export function inputEl(id: string): HTMLInputElement {
    return el<HTMLInputElement>(id);
}

/**
 * Returns typed select element by id.
 * @param id - Element id.
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
