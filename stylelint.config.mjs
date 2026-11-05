/** Validates CSS source without imposing selector naming or formatting rules. */
const MAX_STYLESHEET_LINES = 300;

export default {
    plugins: ["./scripts/lint/stylesheet-lines.mjs"],
    rules: {
        "at-rule-disallowed-list": [["value"], { severity: "warning" }],
        "bartleby/stylesheet-lines": MAX_STYLESHEET_LINES,
        "block-no-empty": true,
        "color-no-invalid-hex": true,
        "media-type-no-deprecated": true,
    },
};
