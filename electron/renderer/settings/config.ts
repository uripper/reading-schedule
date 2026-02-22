import { fields } from "./config_fields.js";

export type {
  BaseFieldDefinition,
  FieldDefinition,
  FieldGroupName,
  InputFieldDefinition,
  SelectFieldDefinition,
  SelectOption,
} from "./config_types.js";

export { fields };

export const weekdays: [string, string][] = [
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
