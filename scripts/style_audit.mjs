#!/usr/bin/env node
/** Entry point for the repository style audit. */
import { analyzeFiles } from "./style_audit/analysis.mjs";
import { collectFiles } from "./style_audit/files.mjs";
import {
	runElectronExecutionCoverageAudit,
	runTestCoverageAudit,
	runTypeCoverageAudit,
} from "./style_audit/coverage.mjs";
import { buildAuditOutcome, printAuditReport } from "./style_audit/report.mjs";

const runStyleAudit = async () => {
	const filePaths = collectFiles();
	const analysis = analyzeFiles(filePaths);
	const typeCoverageAudit = await runTypeCoverageAudit();
	const testCoverageAudit = runTestCoverageAudit(analysis.analyzedRelativePaths);
	const executionCoverageAudit = runElectronExecutionCoverageAudit();
	const outcome = buildAuditOutcome(
		analysis,
		typeCoverageAudit,
		testCoverageAudit,
		executionCoverageAudit,
	);

	printAuditReport(
		analysis,
		typeCoverageAudit,
		testCoverageAudit,
		executionCoverageAudit,
		outcome,
	);

	if (outcome.failures.length > 0) {
		process.exitCode = 1;
	}
};

runStyleAudit().catch((error) => {
	let message = String(error);
	if (error instanceof Error) {
		message = error.message;
	}
	process.stderr.write(`Audit failed unexpectedly: ${message}\n`);
	process.exitCode = 1;
});
