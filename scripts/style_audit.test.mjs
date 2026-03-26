/** Regression tests for style audit path classification helpers. */
import assert from "node:assert/strict";
import test from "node:test";

import {
	isContractsFirstAuditPath,
	isTestCoverageTestFile,
	isTestPath,
} from "./style_audit/path_rules.mjs";
import {
	extractNodeTestPaths,
	extractCoverageReportLines,
	parseNodeCoverageSummary,
} from "./style_audit/coverage.mjs";

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

test("extractNodeTestPaths preserves the curated Node test list", () => {
	assert.deepEqual(
		extractNodeTestPaths(
			"node --test tests/book-lookup-helpers.test.mjs tests/state-recover.test.mjs",
		),
		[
			"tests/book-lookup-helpers.test.mjs",
			"tests/state-recover.test.mjs",
		],
	);
});

test("extractCoverageReportLines keeps only the coverage block", () => {
	assert.deepEqual(
		extractCoverageReportLines(
			"hello\nℹ start of coverage report\nℹ all files | 65.52 | 100.00 | 14.29 | \nℹ end of coverage report\nbye",
		),
		[
			"ℹ start of coverage report",
			"ℹ all files | 65.52 | 100.00 | 14.29 | ",
			"ℹ end of coverage report",
		],
	);
});

test("parseNodeCoverageSummary reads the Node coverage totals", () => {
	assert.deepEqual(
		parseNodeCoverageSummary(
			"ℹ tests 18\nℹ start of coverage report\nℹ all files | 65.52 | 100.00 | 14.29 | \nℹ end of coverage report",
		),
		{
			branchPercent: "100.00",
			functionPercent: "14.29",
			linePercent: "65.52",
			testsCount: 18,
		},
	);
});
