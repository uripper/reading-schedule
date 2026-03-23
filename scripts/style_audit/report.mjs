/** Reporting helpers for style audit output and failures. */
import {
	HARD_LINE_LIMIT,
	MAX_UNDER_MIN_LINE_PERCENT,
	MIN_LINE_LIMIT,
	MIN_TEST_COVERAGE_PERCENT,
	MIN_TYPE_COVERAGE_PERCENT,
	MIN_UNDER_SOFT_PERCENT,
	SOFT_LINE_LIMIT,
} from "./config.mjs";
import {
	formatTestCoveragePercent,
	formatTypeCoveragePercent,
	numericCoveragePercent,
} from "./coverage.mjs";

const writeSection = (title, entries) => {
	process.stdout.write(`\n${title}: ${entries.length}\n`);
	for (const entry of entries) {
		process.stdout.write(`- ${entry.path} (${entry.lines} lines)\n`);
	}
};

const writeHitSection = (title, hits) => {
	process.stdout.write(`\n${title}: ${hits.length}\n`);
	for (const hit of hits) {
		process.stdout.write(`- ${hit}\n`);
	}
};

const writeTextSection = (title, lines) => {
	if (lines.length === 0) {
		return;
	}

	process.stdout.write(`\n${title}\n`);
	for (const line of lines) {
		process.stdout.write(`${line}\n`);
	}
};

const formatPercent = (value) => {
	return value.toFixed(1);
};

const percentageFromCounts = (part, whole, zeroWholePercent = 0) => {
	if (whole === 0) {
		return zeroWholePercent;
	}
	return (part / whole) * 100;
};

const addFailure = (failures, condition, message) => {
	if (condition) {
		failures.push(message);
	}
};

const buildSummaryLines = (
	analysis,
	typeCoverageAudit,
	testCoverageAudit,
	executionCoverageAudit,
) => {
	const underSoftPercent = percentageFromCounts(
		analysis.underSoft,
		analysis.analyzed,
		100,
	);
	const filesUnderMinimumPercent = percentageFromCounts(
		analysis.filesUnderMinimum.length,
		analysis.minimumLineFilesAnalyzed,
	);
	const summaryLines = [
		`Files under ${SOFT_LINE_LIMIT} lines: ${analysis.underSoft}/${analysis.analyzed} (${formatPercent(underSoftPercent)}%)`,
		`Files over ${SOFT_LINE_LIMIT} lines: ${analysis.overSoftLimit.length}`,
		`Files over ${HARD_LINE_LIMIT} lines: ${analysis.overHardLimit.length}`,
		`Files under ${MIN_LINE_LIMIT} lines: ${analysis.filesUnderMinimum.length}/${analysis.minimumLineFilesAnalyzed} (${formatPercent(filesUnderMinimumPercent)}%)`,
		`Ternary expressions: ${analysis.ternaryHits.length}`,
		`Disallowed console methods: ${analysis.consoleHits.length}`,
		`Type/interface definitions outside packages/contracts: ${analysis.typeDefinitionOutsideContractsHits.length}`,
		`Local type/interface definitions without audit-allow-local-types waiver: ${analysis.localTypeWaiverHits.length}`,
		`Probable documentation gaps: ${analysis.documentationHits.length}`,
	];

	if (typeCoverageAudit.failures.length === 0) {
		summaryLines.push(
			`Type coverage: ${formatTypeCoveragePercent(typeCoverageAudit.totalCorrectCount, typeCoverageAudit.totalCount)}% (${typeCoverageAudit.totalUncovered} uncovered across ${typeCoverageAudit.entries.length} targets)`,
		);
	} else {
		summaryLines.push(
			`Type coverage: ${typeCoverageAudit.failures.length} coverage command failures`,
		);
	}

	summaryLines.push(
		`Test coverage surface: ${testCoverageAudit.totalTestCount} test files for ${testCoverageAudit.totalSourceCount} source files (${formatTestCoveragePercent(testCoverageAudit.totalTestCount, testCoverageAudit.totalSourceCount)}%), ${testCoverageAudit.zeroTestAreas} areas with zero tests`,
	);

	if (executionCoverageAudit.summary === null) {
		summaryLines.push(
			`Electron node test execution coverage: ${executionCoverageAudit.failures.length} coverage command failures`,
		);
	} else {
		let statusNote = "";
		if (executionCoverageAudit.status !== null && executionCoverageAudit.status !== 0) {
			statusNote = ` (command exited with status ${executionCoverageAudit.status})`;
		}

		summaryLines.push(
			`Electron node test execution coverage: ${executionCoverageAudit.summary.testsCount} tests, ${executionCoverageAudit.summary.linePercent}% line, ${executionCoverageAudit.summary.branchPercent}% branch, ${executionCoverageAudit.summary.functionPercent}% funcs${statusNote}`,
		);
	}

	return summaryLines;
};

const buildFailureMessages = (
	analysis,
	typeCoverageAudit,
	testCoverageAudit,
	executionCoverageAudit,
) => {
	const failures = [];
	const underSoftPercent = percentageFromCounts(
		analysis.underSoft,
		analysis.analyzed,
		100,
	);
	const filesUnderMinimumPercent = percentageFromCounts(
		analysis.filesUnderMinimum.length,
		analysis.minimumLineFilesAnalyzed,
	);
	const typeCoveragePercent = numericCoveragePercent(
		typeCoverageAudit.totalCorrectCount,
		typeCoverageAudit.totalCount,
	);
	const testCoveragePercent = numericCoveragePercent(
		testCoverageAudit.totalTestCount,
		testCoverageAudit.totalSourceCount,
	);

	addFailure(
		failures,
		analysis.overHardLimit.length > 0,
		`Files over ${HARD_LINE_LIMIT} lines: ${analysis.overHardLimit.length}`,
	);
	addFailure(
		failures,
		underSoftPercent < MIN_UNDER_SOFT_PERCENT,
		`Files under ${SOFT_LINE_LIMIT} lines below ${MIN_UNDER_SOFT_PERCENT}%: ${formatPercent(underSoftPercent)}%`,
	);
	addFailure(
		failures,
		filesUnderMinimumPercent > MAX_UNDER_MIN_LINE_PERCENT,
		`Files under ${MIN_LINE_LIMIT} lines above ${MAX_UNDER_MIN_LINE_PERCENT}%: ${analysis.filesUnderMinimum.length}/${analysis.minimumLineFilesAnalyzed} (${formatPercent(filesUnderMinimumPercent)}%)`,
	);
	addFailure(
		failures,
		analysis.ternaryHits.length > 0,
		`Ternary expressions found: ${analysis.ternaryHits.length}`,
	);
	addFailure(
		failures,
		analysis.consoleHits.length > 0,
		`Disallowed console methods found: ${analysis.consoleHits.length}`,
	);
	addFailure(
		failures,
		analysis.typeDefinitionOutsideContractsHits.length > 0,
		`Type/interface definitions outside packages/contracts: ${analysis.typeDefinitionOutsideContractsHits.length}`,
	);
	addFailure(
		failures,
		analysis.localTypeWaiverHits.length > 0,
		`Local type/interface definitions without audit-allow-local-types waiver: ${analysis.localTypeWaiverHits.length}`,
	);
	addFailure(
		failures,
		analysis.documentationHits.length > 0,
		`Probable documentation gaps: ${analysis.documentationHits.length}`,
	);
	failures.push(...typeCoverageAudit.failures);
	if (typeCoverageAudit.failures.length === 0) {
		addFailure(
			failures,
			typeCoveragePercent < MIN_TYPE_COVERAGE_PERCENT,
			`Type coverage below ${MIN_TYPE_COVERAGE_PERCENT}%: ${formatTypeCoveragePercent(typeCoverageAudit.totalCorrectCount, typeCoverageAudit.totalCount)}%`,
		);
	}
	addFailure(
		failures,
		testCoveragePercent < MIN_TEST_COVERAGE_PERCENT,
		`Test coverage surface below ${MIN_TEST_COVERAGE_PERCENT}%: ${formatTestCoveragePercent(testCoverageAudit.totalTestCount, testCoverageAudit.totalSourceCount)}%`,
	);
	failures.push(...executionCoverageAudit.failures);

	return failures;
};

export const buildAuditOutcome = (
	analysis,
	typeCoverageAudit,
	testCoverageAudit,
	executionCoverageAudit,
) => {
	return {
		failures: buildFailureMessages(
			analysis,
			typeCoverageAudit,
			testCoverageAudit,
			executionCoverageAudit,
		),
		summaryLines: buildSummaryLines(
			analysis,
			typeCoverageAudit,
			testCoverageAudit,
			executionCoverageAudit,
		),
	};
};

export const printAuditReport = (
	analysis,
	typeCoverageAudit,
	testCoverageAudit,
	executionCoverageAudit,
	outcome,
) => {
	process.stdout.write("Style audit report\n");
	process.stdout.write(`Analyzed files: ${analysis.analyzed}\n`);
	process.stdout.write(
		`Files under ${SOFT_LINE_LIMIT} lines: ${analysis.underSoft}/${analysis.analyzed} (${formatPercent(percentageFromCounts(analysis.underSoft, analysis.analyzed, 100))}%)\n`,
	);
	process.stdout.write(
		`Files at or above ${MIN_LINE_LIMIT} lines: ${analysis.filesAtOrAboveMinimum}/${analysis.minimumLineFilesAnalyzed} (${formatPercent(percentageFromCounts(analysis.filesAtOrAboveMinimum, analysis.minimumLineFilesAnalyzed, 100))}%)\n`,
	);

	writeSection(`Files over ${SOFT_LINE_LIMIT} lines`, analysis.overSoftLimit);
	writeSection(`Files over ${HARD_LINE_LIMIT} lines`, analysis.overHardLimit);
	writeSection(
		`Files under ${MIN_LINE_LIMIT} code lines`,
		analysis.filesUnderMinimum,
	);
	writeHitSection("Ternary expressions", analysis.ternaryHits);
	writeHitSection("Disallowed console methods", analysis.consoleHits);
	writeHitSection(
		"Type/interface definitions outside packages/contracts",
		analysis.typeDefinitionOutsideContractsHits,
	);
	writeHitSection(
		"Local type/interface definitions without audit-allow-local-types waiver",
		analysis.localTypeWaiverHits,
	);
	writeHitSection("Type coverage", typeCoverageAudit.hits);
	writeHitSection("Test coverage surface", testCoverageAudit.hits);
	writeTextSection(
		"Electron node test execution coverage report",
		executionCoverageAudit.reportLines,
	);
	writeHitSection("Probable documentation gaps", analysis.documentationHits);

	if (outcome.failures.length > 0) {
		process.stderr.write("\nAudit failed:\n");
		for (const summaryLine of outcome.summaryLines) {
			process.stderr.write(`- ${summaryLine}\n`);
		}
		process.stderr.write("\nBlocking failures:\n");
		for (const failure of outcome.failures) {
			process.stderr.write(`- ${failure}\n`);
		}
		return;
	}

	process.stdout.write("\nAudit passed.\n");
};
