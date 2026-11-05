/** Enforces the workspace's line limit on function bodies. */

/** Counts nonblank lines inside a block, excluding its outer braces. */
function countBodyLines(sourceCode, body) {
    const BODY = sourceCode.getText(body);
    if (body.type !== "BlockStatement") {
        return BODY.split(/\r?\n/u).length;
    }
    return BODY.slice(1, -1)
        .split(/\r?\n/u)
        .filter((line) => line.trim().length > 0).length;
}

const FUNCTION_BODY_LINES = {
    meta: {
        schema: [{ minimum: 1, type: "integer" }],
    },
    /** Checks function declarations, expressions, and arrow function bodies. */
    create(context) {
        const [MAX_LINES] = context.options;

        /** Reports a body that exceeds the configured line limit. */
        const CHECK_BODY = (node) => {
            const LINE_COUNT = countBodyLines(context.sourceCode, node.body);
            if (LINE_COUNT > MAX_LINES) {
                context.report({
                    message: `Function body has ${LINE_COUNT} nonblank lines. Limit is ${MAX_LINES}.`,
                    node: node.body,
                });
            }
        };

        return {
            ArrowFunctionExpression: CHECK_BODY,
            FunctionDeclaration: CHECK_BODY,
            FunctionExpression: CHECK_BODY,
        };
    },
};

export default {
    meta: { name: "bartleby" },
    rules: { "function-body-lines": FUNCTION_BODY_LINES },
};
