/** Regression tests for style audit path classification helpers. */
import assert from "node:assert/strict";
import test from "node:test";

import {
	isContractsFirstAuditPath,
	isTestCoverageTestFile,
	isTestPath,
} from "./style_audit/path_rules.mjs";

test("classifies Python and JavaScript test files", () => {
	assert.equal(isTestCoverageTestFile("tests/test_api.py"), true);
	assert.equal(isTestCoverageTestFile("scripts/style_audit.test.mjs"), true);
	assert.equal(isTestCoverageTestFile("src/feature.test.ts"), true);
});

test("rejects non-test paths", () => {
	assert.equal(isTestCoverageTestFile("src/feature.ts"), false);
	assert.equal(isTestCoverageTestFile("src/helpers.py"), false);
});

test("treats test paths as non-contracts-first audit paths", () => {
	assert.equal(isTestPath("scripts/style_audit.test.mjs"), true);
	assert.equal(isContractsFirstAuditPath("apps/website/src/app.ts"), true);
	assert.equal(isContractsFirstAuditPath("scripts/style_audit.test.mjs"), false);
});
