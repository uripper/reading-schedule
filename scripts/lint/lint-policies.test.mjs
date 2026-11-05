/** Exercises the line-limit checks used by the workspace lint commands. */
import assert from "node:assert/strict";
import { test } from "node:test";
import stylelint from "stylelint";
import functionBodyPlugin from "./function-body-lines.mjs";
import stylesheetLines from "./stylesheet-lines.mjs";

const LINE_LIMIT = 2;
const STYLESHEET_RULE = "bartleby/stylesheet-lines";

/** Runs the function visitor against source text and returns its reports. */
function functionReports(bodyText) {
    const REPORTS = [];
    const RULE = functionBodyPlugin.rules["function-body-lines"];
    const VISITOR = RULE.create({
        options: [LINE_LIMIT],
        report: (report) => REPORTS.push(report),
        sourceCode: { getText: () => bodyText },
    });
    VISITOR.FunctionDeclaration({ body: { type: "BlockStatement" } });
    return REPORTS;
}

test("function line limit counts the body and skips blank lines", () => {
    assert.deepEqual(functionReports("{\nfirst();\n\nsecond();\n}"), []);
    const [REPORT] = functionReports("{\nfirst();\nsecond();\nthird();\n}");
    assert.match(REPORT.message, /3 nonblank lines/u);
});

test("stylesheet line limit skips blanks and reports over-limit CSS", async () => {
    const CONFIG = {
        plugins: [stylesheetLines],
        rules: { [STYLESHEET_RULE]: LINE_LIMIT },
    };
    const ACCEPTED = await stylelint.lint({
        code: ".a {}\n\n.b {}\n",
        config: CONFIG,
    });
    const REJECTED = await stylelint.lint({
        code: ".a {}\n.b {}\n.c {}\n",
        config: CONFIG,
    });
    assert.equal(ACCEPTED.errored, false);
    assert.equal(REJECTED.errored, true);
    assert.equal(REJECTED.results[0].warnings[0].rule, STYLESHEET_RULE);
});
