/** Enforces the workspace's line limit on CSS source. */
import stylelint from "stylelint";

const RULE_NAME = "bartleby/stylesheet-lines";
const MESSAGES = stylelint.utils.ruleMessages(RULE_NAME, {
    /** @param {number} limit - Configured maximum number of nonblank lines. */
    rejected: (limit) => `Stylesheet exceeds ${limit} nonblank lines.`,
});

/** Checks the stylesheet's original text so comments and formatting count. */
function stylesheetLines(limit) {
    return (root, result) => {
        const VALID_OPTIONS = stylelint.utils.validateOptions(
            result,
            RULE_NAME,
            {
                actual: limit,
                possible: (value) => Number.isInteger(value) && value > 0,
            },
        );
        if (!VALID_OPTIONS) {
            return;
        }
        const LINE_COUNT = root.source.input.css
            .split(/\r?\n/u)
            .filter((line) => line.trim().length > 0).length;
        if (LINE_COUNT > limit) {
            stylelint.utils.report({
                message: MESSAGES.rejected(limit),
                node: root,
                result,
                ruleName: RULE_NAME,
            });
        }
    };
}

export default stylelint.createPlugin(RULE_NAME, stylesheetLines);
