/** File-by-file analysis for the style audit. */
import fs from "node:fs";
import path from "node:path";

import { JS_TS_EXTENSIONS, MIN_LINE_LIMIT, SOFT_LINE_LIMIT, HARD_LINE_LIMIT } from "./config.mjs";
import {
	isTypeDirectoryPath,
	shouldSkipFile,
	toRelative,
} from "./path_rules.mjs";
import {
	countCodeLines,
	hasMinimumLineCountExemption,
	sortByLinesAscending,
	sortByLinesDescending,
} from "./line_rules.mjs";
import { scanJsTsDocumentation, scanPythonDocumentation } from "./documentation_rules.mjs";
import { scanJsTsFile } from "./ts_rules.mjs";

const createAnalysisState = () => {
	return {
		analyzed: 0,
		analyzedRelativePaths: [],
		consoleHits: [],
		documentationHits: [],
		filesAtOrAboveMinimum: 0,
		filesUnderMinimum: [],
		localTypeWaiverHits: [],
		minimumLineFilesAnalyzed: 0,
		overHardLimit: [],
		overSoftLimit: [],
		ternaryHits: [],
		typeDefinitionOutsideContractsHits: [],
		underSoft: 0,
	};
};

const updateLineMetrics = (state, relativePath, lineCount) => {
	if (lineCount < SOFT_LINE_LIMIT) {
		state.underSoft += 1;
	}
	if (lineCount > SOFT_LINE_LIMIT) {
		state.overSoftLimit.push({ lines: lineCount, path: relativePath });
	}
	if (lineCount > HARD_LINE_LIMIT && !isTypeDirectoryPath(relativePath)) {
		state.overHardLimit.push({ lines: lineCount, path: relativePath });
	}
};

const updateMinimumLineMetrics = (
	state,
	relativePath,
	content,
	extension,
	lineCount,
) => {
	if (hasMinimumLineCountExemption(relativePath, content, extension)) {
		return;
	}

	state.minimumLineFilesAnalyzed += 1;
	if (lineCount >= MIN_LINE_LIMIT) {
		state.filesAtOrAboveMinimum += 1;
		return;
	}

	state.filesUnderMinimum.push({ lines: lineCount, path: relativePath });
};

const scanFileContent = (state, relativePath, content, extension) => {
	if (JS_TS_EXTENSIONS.has(extension)) {
		scanJsTsFile({
			consoleHits: state.consoleHits,
			content,
			extension,
			localTypeWaiverHits: state.localTypeWaiverHits,
			relativePath,
			ternaryHits: state.ternaryHits,
			typeDefinitionOutsideContractsHits:
				state.typeDefinitionOutsideContractsHits,
		});
		scanJsTsDocumentation(relativePath, content, state.documentationHits);
		return;
	}

	if (extension === ".py") {
		scanPythonDocumentation(relativePath, content, state.documentationHits);
	}
};

const processFile = (state, filePath) => {
	const extension = path.extname(filePath);
	const relativePath = toRelative(filePath);

	if (shouldSkipFile(relativePath)) {
		return;
	}

	const content = fs.readFileSync(filePath, "utf8");
	const lineCount = countCodeLines(content, extension);

	state.analyzedRelativePaths.push(relativePath);
	state.analyzed += 1;
	updateLineMetrics(state, relativePath, lineCount);
	updateMinimumLineMetrics(
		state,
		relativePath,
		content,
		extension,
		lineCount,
	);
	scanFileContent(state, relativePath, content, extension);
};

export const analyzeFiles = (filePaths) => {
	const state = createAnalysisState();

	for (const filePath of filePaths) {
		processFile(state, filePath);
	}

	sortByLinesDescending(state.overSoftLimit);
	sortByLinesDescending(state.overHardLimit);
	sortByLinesAscending(state.filesUnderMinimum);

	return state;
};
