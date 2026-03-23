/** Type coverage and test-surface coverage audits. */
import * as typeCoverageCore from "type-coverage-core";

import { TEST_COVERAGE_AREAS, TYPE_COVERAGE_CHECKS } from "./config.mjs";
import {
	isPathUnderPrefixes,
	isTestCoverageSourceFile,
	isTestCoverageTestFile,
} from "./path_rules.mjs";

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
