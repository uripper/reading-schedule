/** Type coverage and test-surface coverage audits. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as typeCoverageCore from "type-coverage-core";

import { TEST_COVERAGE_AREAS, TYPE_COVERAGE_CHECKS } from "./config.mjs";
import {
	isPathUnderPrefixes,
	isTestCoverageSourceFile,
	isTestCoverageTestFile,
} from "./path_rules.mjs";

const DESKTOP_FRONTEND_ROOT = path.join(process.cwd(), "packages", "frontend");
const DESKTOP_FRONTEND_PACKAGE_JSON_PATH = path.join(
	DESKTOP_FRONTEND_ROOT,
	"package.json",
);
const NODE_TEST_COVERAGE_ARGS = [
	"--no-warnings",
	"--experimental-test-coverage",
	"--test",
];
const COVERAGE_OUTPUT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const NODE_TEST_SCRIPT_PATTERN = /tests\/[^\s"]+\.test\.mjs/g;
const NODE_TEST_COUNT_PATTERN = /\btests\s+(\d+)\b/;
const COVERAGE_REPORT_START_MARKER = "start of coverage report";
const COVERAGE_REPORT_END_MARKER = "end of coverage report";
const COVERAGE_ALL_FILES_PATTERN =
	/all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|/;

const formatErrorMessage = (error) => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

const formatCoveragePercent = (correctCount, totalCount, digits) => {
	if (totalCount === 0) {
		if (digits === 2) {
			return "100.00";
		}
		return "100.0";
	}

	const percent = Math.floor((correctCount * 10 ** (digits + 2)) / totalCount);
	return (percent / 10 ** digits).toFixed(digits);
};

export const formatTypeCoveragePercent = (correctCount, totalCount) => {
	return formatCoveragePercent(correctCount, totalCount, 2);
};

export const formatTestCoveragePercent = (testCount, sourceCount) => {
	return formatCoveragePercent(testCount, sourceCount, 1);
};

export const numericCoveragePercent = (correctCount, totalCount) => {
	if (totalCount === 0) {
		return 100;
	}

	return (correctCount * 100) / totalCount;
};

export const extractNodeTestPaths = (script) => {
	const matches = script.match(NODE_TEST_SCRIPT_PATTERN);
	if (matches === null) {
		return [];
	}

	return matches;
};

const readDesktopFrontendNodePaths = () => {
	const packageJsonText = fs.readFileSync(
		DESKTOP_FRONTEND_PACKAGE_JSON_PATH,
		"utf8",
	);
	const packageJson = JSON.parse(packageJsonText);
	const script = packageJson.scripts?.test;

	if (typeof script !== "string") {
		throw new Error("packages/frontend/package.json is missing scripts.test");
	}

	const testPaths = extractNodeTestPaths(script);
	if (testPaths.length === 0) {
		throw new Error("packages/frontend/package.json test script has no test files");
	}

	return testPaths;
};

export const extractCoverageReportLines = (output) => {
	const lines = output.split(/\r?\n/);
	let startIndex = -1;
	let endIndex = -1;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];

		if (startIndex < 0 && line.includes(COVERAGE_REPORT_START_MARKER)) {
			startIndex = index;
			continue;
		}

		if (startIndex >= 0 && line.includes(COVERAGE_REPORT_END_MARKER)) {
			endIndex = index;
			break;
		}
	}

	if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
		return [];
	}

	return lines.slice(startIndex, endIndex + 1);
};

export const parseNodeCoverageSummary = (output) => {
	const reportLines = extractCoverageReportLines(output);
	if (reportLines.length === 0) {
		return null;
	}

	const testsMatch = output.match(NODE_TEST_COUNT_PATTERN);
	const allFilesLine = reportLines.find((line) => {
		return line.includes("all files");
	});

	if (allFilesLine === undefined) {
		return null;
	}

	const coverageMatch = allFilesLine.match(COVERAGE_ALL_FILES_PATTERN);
	if (coverageMatch === null) {
		return null;
	}

	let testsCount = 0;
	if (testsMatch !== null) {
		testsCount = Number.parseInt(testsMatch[1], 10);
	}

	return {
		branchPercent: coverageMatch[2],
		functionPercent: coverageMatch[3],
		linePercent: coverageMatch[1],
		testsCount,
	};
};

const runDesktopNodeCoverageCommand = (testPaths) => {
	return spawnSync(
		process.execPath,
		[...NODE_TEST_COVERAGE_ARGS, ...testPaths],
		{
			cwd: DESKTOP_FRONTEND_ROOT,
			encoding: "utf8",
			maxBuffer: COVERAGE_OUTPUT_MAX_BUFFER_BYTES,
		},
	);
};

export const runDesktopExecutionCoverageAudit = () => {
	try {
		const testPaths = readDesktopFrontendNodePaths();
		const result = runDesktopNodeCoverageCommand(testPaths);
		const stdout = result.stdout ?? "";
		const reportLines = extractCoverageReportLines(stdout);
		const summary = parseNodeCoverageSummary(stdout);
		const failures = [];

		if (result.error !== undefined) {
			failures.push(
				`Desktop frontend node coverage command failed to start: ${formatErrorMessage(result.error)}`,
			);
		}

		if (reportLines.length === 0) {
			failures.push("Desktop frontend node coverage report was not emitted.");
		}

		if (summary === null) {
			failures.push("Desktop frontend node coverage summary could not be parsed.");
		}

		return {
			failures,
			reportLines,
			status: result.status,
			summary,
		};
	} catch (error) {
		return {
			failures: [
				`Desktop frontend node coverage audit failed: ${formatErrorMessage(error)}`,
			],
			reportLines: [],
			status: null,
			summary: null,
		};
	}
};

export const runTestCoverageAudit = (relativePaths) => {
	const hits = [];
	const areas = [];
	let totalSourceCount = 0;
	let totalTestCount = 0;
	let zeroTestAreas = 0;

	for (const area of TEST_COVERAGE_AREAS) {
		let sourceCount = 0;
		let testCount = 0;

		for (const relativePath of relativePaths) {
			if (
				isPathUnderPrefixes(relativePath, area.sourcePrefixes) &&
				isTestCoverageSourceFile(relativePath)
			) {
				sourceCount += 1;
			}
			if (
				isPathUnderPrefixes(relativePath, area.testPrefixes) &&
				isTestCoverageTestFile(relativePath)
			) {
				testCount += 1;
			}
		}

		areas.push({
			label: area.label,
			sourceCount,
			testCount,
		});
		totalSourceCount += sourceCount;
		totalTestCount += testCount;
		if (sourceCount > 0 && testCount === 0) {
			zeroTestAreas += 1;
		}
		hits.push(
			`${area.label}: ${testCount} test files for ${sourceCount} source files (${formatTestCoveragePercent(testCount, sourceCount)}%)`,
		);
	}

	return {
		areas,
		hits,
		totalSourceCount,
		totalTestCount,
		zeroTestAreas,
	};
};

export const runTypeCoverageAudit = async () => {
	const { lint: typeCoverageLint } = typeCoverageCore;
	const entries = [];
	const hits = [];
	const failures = [];
	let totalCorrectCount = 0;
	let totalCount = 0;
	let totalUncovered = 0;

	for (const check of TYPE_COVERAGE_CHECKS) {
		try {
			const summary = await typeCoverageLint(check.project, {
				cacheDirectory: ".type-coverage",
				enableCache: true,
				strict: true,
			});
			entries.push({
				label: check.label,
				correctCount: summary.correctCount,
				totalCount: summary.totalCount,
			});
			totalCorrectCount += summary.correctCount;
			totalCount += summary.totalCount;
			const uncovered = summary.totalCount - summary.correctCount;
			totalUncovered += uncovered;
			hits.push(
				`${check.label}: ${formatTypeCoveragePercent(summary.correctCount, summary.totalCount)}% (${summary.correctCount}/${summary.totalCount}, ${uncovered} uncovered)`,
			);
		} catch (error) {
			let message = String(error);
			if (error instanceof Error) {
				message = error.message;
			}
			failures.push(
				`Type coverage command failed for ${check.label}: ${message}`,
			);
		}
	}

	return {
		entries,
		failures,
		hits,
		totalCorrectCount,
		totalCount,
		totalUncovered,
	};
};
