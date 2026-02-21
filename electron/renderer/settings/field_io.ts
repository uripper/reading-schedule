import { el } from "../dom.js";
import { DIFFICULTY_LEVEL_COUNT, fields, type FieldDefinition } from "./config.js";

export function inputEl(id: string): HTMLInputElement {
  return el<HTMLInputElement>(id);
}

export function selectEl(id: string): HTMLSelectElement {
  return el<HTMLSelectElement>(id);
}

export function allFieldDefinitions(): FieldDefinition[] {
  return Object.values(fields).flat();
}

export function numberLevels(): number[] {
  return Array.from({ length: DIFFICULTY_LEVEL_COUNT }, (_, index) => index + 1);
}
