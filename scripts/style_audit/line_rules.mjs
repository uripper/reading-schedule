/** Line-count and minimum-size helpers for the style audit. */
import path from "node:path";

import { JS_TS_EXTENSIONS } from "./config.mjs";
import {
	isDeclarationFile,
	isTestCoverageTestFile,
} from "./path_rules.mjs";

export const stripLineComment = (line) => {
	const commentIndex = line.indexOf("//");
	if (commentIndex < 0) {
		return line;
	}
	return line.slice(0, commentIndex);
};

const nearestPythonBlockStart = (line, cursor) => {
	const tripleDoubleIndex = line.indexOf('"""', cursor);
	const tripleSingleIndex = line.indexOf("'''", cursor);

	if (tripleDoubleIndex < 0 && tripleSingleIndex < 0) {
		return { index: -1, marker: "" };
	}

	if (tripleDoubleIndex < 0) {
		return { index: tripleSingleIndex, marker: "'''" };
	}

	if (tripleSingleIndex < 0) {
		return { index: tripleDoubleIndex, marker: '"""' };
	}

	if (tripleDoubleIndex < tripleSingleIndex) {
		return { index: tripleDoubleIndex, marker: '"""' };
	}

	return { index: tripleSingleIndex, marker: "'''" };
};

const stripJsTsCommentsForLine = (rawLine, state) => {
	let line = rawLine;

	while (state.inBlockComment) {
		const endIndex = line.indexOf("*/");
		if (endIndex < 0) {
			return "";
		}
		line = line.slice(endIndex + 2);
		state.inBlockComment = false;
	}

	let output = "";
	let cursor = 0;

	while (cursor < line.length) {
		const blockStart = line.indexOf("/*", cursor);
		const lineCommentStart = line.indexOf("//", cursor);

		if (blockStart < 0 && lineCommentStart < 0) {
			output += line.slice(cursor);
			break;
		}

		if (
			lineCommentStart >= 0 &&
			(blockStart < 0 || lineCommentStart < blockStart)
		) {
			output += line.slice(cursor, lineCommentStart);
			break;
		}

		output += line.slice(cursor, blockStart);
		const blockEnd = line.indexOf("*/", blockStart + 2);
		if (blockEnd < 0) {
			state.inBlockComment = true;
			break;
		}
		cursor = blockEnd + 2;
	}

	return output;
};

const stripPythonCommentsForLine = (rawLine, state) => {
	let line = rawLine;

	while (state.blockMarker) {
		const endIndex = line.indexOf(state.blockMarker);
		if (endIndex < 0) {
			return "";
		}
		line = line.slice(endIndex + state.blockMarker.length);
		state.blockMarker = "";
	}

	let output = "";
	let cursor = 0;

	while (cursor < line.length) {
		const hashIndex = line.indexOf("#", cursor);
		const blockStart = nearestPythonBlockStart(line, cursor);

		if (hashIndex < 0 && blockStart.index < 0) {
			output += line.slice(cursor);
			break;
		}

		if (
			hashIndex >= 0 &&
			(blockStart.index < 0 || hashIndex < blockStart.index)
		) {
			output += line.slice(cursor, hashIndex);
			break;
		}

		output += line.slice(cursor, blockStart.index);
		const blockEnd = line.indexOf(
			blockStart.marker,
			blockStart.index + blockStart.marker.length,
		);
		if (blockEnd < 0) {
			state.blockMarker = blockStart.marker;
			break;
		}
		cursor = blockEnd + blockStart.marker.length;
	}

	return output;
};

export const countCodeLines = (content, extension) => {
	if (content.length === 0) {
		return 0;
	}

	const lines = content.split(/\r?\n/);
	let count = 0;

	if (extension === ".py") {
		const state = { blockMarker: "" };
		for (const rawLine of lines) {
			const stripped = stripPythonCommentsForLine(rawLine, state).trim();
			if (stripped.length > 0) {
				count += 1;
			}
		}
		return count;
	}

	const state = { inBlockComment: false };
	for (const rawLine of lines) {
		const stripped = stripJsTsCommentsForLine(rawLine, state).trim();
		if (stripped.length > 0) {
			count += 1;
		}
	}

	return count;
};

const compareByLinesDescending = (left, right) => {
	if (left.lines > right.lines) {
		return -1;
	}
	if (left.lines < right.lines) {
		return 1;
	}
	return left.path.localeCompare(right.path);
};

const compareByLinesAscending = (left, right) => {
	if (left.lines < right.lines) {
		return -1;
	}
	if (left.lines > right.lines) {
		return 1;
	}
	return left.path.localeCompare(right.path);
};

export const sortByLinesDescending = (entries) => {
	entries.sort(compareByLinesDescending);
};

export const sortByLinesAscending = (entries) => {
	entries.sort(compareByLinesAscending);
};

const isMinimumLineCountExempt = (relativePath) => {
	return path.basename(relativePath) === "__init__.py";
};

export const isBarrelModule = (content, extension) => {
	if (!JS_TS_EXTENSIONS.has(extension)) {
		return false;
	}

	const lines = content.split(/\r?\n/);
	let hasExportLine = false;

	for (const rawLine of lines) {
		const trimmed = rawLine.trim();

		if (!trimmed) {
			continue;
		}
		if (
			trimmed.startsWith("//") ||
			trimmed.startsWith("/*") ||
			trimmed.startsWith("*") ||
			trimmed === "*/"
		) {
			continue;
		}
		if (trimmed.startsWith("import type ")) {
			continue;
		}
		if (
			trimmed.startsWith("export *") ||
			trimmed.startsWith("export type {") ||
			trimmed.startsWith("export {")
		) {
			hasExportLine = true;
			continue;
		}
		return false;
	}

	return hasExportLine;
};

export const hasMinimumLineCountExemption = (
	relativePath,
	content,
	extension,
) => {
	return (
		isMinimumLineCountExempt(relativePath) ||
		isDeclarationFile(relativePath) ||
		isTestCoverageTestFile(relativePath) ||
		isBarrelModule(content, extension)
	);
};
