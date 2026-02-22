export const ALL_JS_GLOBS = ["**/*.js", "**/*.mjs"];
export const ALL_TS_GLOBS = ["**/*.ts"];
export const ALL_CODE_GLOBS = ["eslint.config.mjs", ...ALL_JS_GLOBS, ...ALL_TS_GLOBS];

export const ALLOWED_CONSOLE_METHODS = [
  "assert",
  "clear",
  "count",
  "group",
  "groupCollapsed",
  "groupEnd",
  "info",
  "table",
  "time",
  "timeEnd",
  "trace",
];
