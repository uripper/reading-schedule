import { fields } from "./config_fields.js";

export { fields };

export const weekdays: Array<[string, string]> = [
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
