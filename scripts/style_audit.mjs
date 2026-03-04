#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as ts from "typescript";

const SOURCE_ROOTS = [
	"src",
	"electron",
	"apps",
	"packages",
	"services",
	"scripts",
	"tests",
	"mobile/src",
];

const CODE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".py",
]);

const JS_TS_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
]);

const TS_EXTENSIONS = new Set([".ts", ".tsx"]);

const IGNORED_DIRECTORIES = new Set([
	".git",
	".pnpm-store",
	".pytest_cache",
	".scannerwork",
	".sonarlint",
	".tmp-pycompat",
	".venv",
	".venv-py311-backup",
	"node_modules",
	"dist",
	"build",
	"coverage",
	"generated",
]);

const IGNORED_FILES = new Set(["eslint.config.mjs", "style_audit.mjs"]);

const SOFT_LINE_LIMIT = 200;
const HARD_LINE_LIMIT = 300;
const MIN_UNDER_SOFT_PERCENT = 90;
const TYPES_MIN_LINE_LIMIT = 30;

const AUDIT_SELF_PATH = "scripts/style_audit.mjs";
const DISALLOWED_CONSOLE_PATTERN = /\bconsole\.(error|warn|log|debug)\s*\(/g;

const FUNCTION_DECLARATION_PATTERNS = [
	/^(export\s+)?(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
	/^export\s+default\s+(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
];

const CLASS_DECLARATION_PATTERNS = [
	/^(export\s+)?(abstract\s+)?class\s+[A-Za-z_$][\w$]*\b/,
	/^export\s+default\s+(abstract\s+)?class\s+[A-Za-z_$][\w$]*\b/,
];

function toRelative(filePath) {
	return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function stripJsTsCommentsForLine(rawLine, state) {
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
}

function nearestPythonBlockStart(line, cursor) {
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
}

function stripPythonCommentsForLine(rawLine, state) {
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
}

function countCodeLines(content, extension) {
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
}

function stripLineComment(line) {
	const commentIndex = line.indexOf("//");
	if (commentIndex < 0) {
		return line;
	}
	return line.slice(0, commentIndex);
}

function scriptKindForExtension(extension) {
	if (extension === ".ts") {
		return ts.ScriptKind.TS;
	}
	if (extension === ".tsx") {
		return ts.ScriptKind.TSX;
	}
	if (extension === ".jsx") {
		return ts.ScriptKind.JSX;
	}
	return ts.ScriptKind.JS;
}

function parseJsTsSource(relativePath, content, extension) {
	return ts.createSourceFile(
		relativePath,
		content,
		ts.ScriptTarget.Latest,
		true,
		scriptKindForExtension(extension),
	);
}

function walkNodes(rootNode, visitNode) {
	const stack = [rootNode];
	while (stack.length > 0) {
		const node = stack.pop();
		if (node === undefined) {
			continue;
		}
		visitNode(node);
		ts.forEachChild(node, (child) => {
			stack.push(child);
		});
	}
}

function pushTernaryHits(relativePath, sourceFile, ternaryHits) {
	walkNodes(sourceFile, (node) => {
		if (ts.isConditionalExpression(node)) {
			const position = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile),
			);
			ternaryHits.push(`${relativePath}:${position.line + 1}`);
		}
	});
}

function isInTypesDirectory(relativePath) {
	const segments = relativePath.split("/");
	return segments.includes("types");
}

function pushTypeDefinitionHitsOutsideTypes(
	relativePath,
	sourceFile,
	typeHits,
) {
	if (relativePath.endsWith(".d.ts")) {
		return;
	}
	if (relativePath.startsWith("electron/tokens/dist/")) {
		return;
	}
	if (isInTypesDirectory(relativePath)) {
		return;
	}

	let declarationCount = 0;
	let firstLine = 0;

	walkNodes(sourceFile, (node) => {
		if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
			declarationCount += 1;
			if (firstLine === 0) {
				const position = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(sourceFile),
				);
				firstLine = position.line + 1;
			}
		}
	});

	if (declarationCount > 0) {
		typeHits.push(
			`${relativePath}:${firstLine} ${declarationCount} type/interface declarations`,
		);
	}
}

function collectFiles() {
	const files = [];
	const stack = [];

	for (const root of SOURCE_ROOTS) {
		const absoluteRoot = path.join(process.cwd(), root);
		if (fs.existsSync(absoluteRoot)) {
			stack.push(absoluteRoot);
		}
	}

	while (stack.length > 0) {
		const directory = stack.pop();
		if (directory === undefined) {
			continue;
		}

		const entries = fs.readdirSync(directory, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) {
					continue;
				}
				stack.push(fullPath);
				continue;
			}

			if (IGNORED_FILES.has(entry.name)) {
				continue;
			}

			if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
				files.push(fullPath);
			}
		}
	}

	return files;
}

function sortByLines(entries) {
	entries.sort((left, right) => {
		if (left.lines > right.lines) {
			return -1;
		}
		if (left.lines < right.lines) {
			return 1;
		}
		return left.path.localeCompare(right.path);
	});
}

function sortByLinesAscending(entries) {
	entries.sort((left, right) => {
		if (left.lines < right.lines) {
			return -1;
		}
		if (left.lines > right.lines) {
			return 1;
		}
		return left.path.localeCompare(right.path);
	});
}

function shouldSkipFile(relativePath) {
	if (relativePath === AUDIT_SELF_PATH) {
		return true;
	}
	return false;
}

function isElectronTypesPath(relativePath) {
	return relativePath.startsWith("electron/types/");
}

function scanJsTs(
	relativePath,
	content,
	extension,
	ternaryHits,
	consoleHits,
	typeHits,
) {
	const lines = content.split(/\r?\n/);
	let lineNumber = 1;

	for (const rawLine of lines) {
		const line = stripLineComment(rawLine).replace(
			/(['"`])(?:\\.|(?!\1).)*\1/g,
			"",
		);

		let match = DISALLOWED_CONSOLE_PATTERN.exec(line);
		while (match !== null) {
			consoleHits.push(`${relativePath}:${lineNumber} console.${match[1]}`);
			match = DISALLOWED_CONSOLE_PATTERN.exec(line);
		}
		DISALLOWED_CONSOLE_PATTERN.lastIndex = 0;

		lineNumber += 1;
	}

	const sourceFile = parseJsTsSource(relativePath, content, extension);
	pushTernaryHits(relativePath, sourceFile, ternaryHits);

	if (TS_EXTENSIONS.has(extension)) {
		pushTypeDefinitionHitsOutsideTypes(relativePath, sourceFile, typeHits);
	}
}

function isJsTsModuleDocLine(line) {
	return line.startsWith("/**");
}

function hasJsTsModuleDoc(lines) {
	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			continue;
		}
		if (trimmed.startsWith("#!")) {
			continue;
		}
		if (trimmed.startsWith("//")) {
			continue;
		}

		return isJsTsModuleDocLine(trimmed);
	}

	return true;
}

function hasJSDocAbove(lines, declarationLineIndex) {
	let lineIndex = declarationLineIndex - 1;
	while (lineIndex >= 0 && !lines[lineIndex].trim()) {
		lineIndex -= 1;
	}
	if (lineIndex < 0) {
		return false;
	}

	if (!lines[lineIndex].trim().endsWith("*/")) {
		return false;
	}

	while (lineIndex >= 0) {
		const trimmed = lines[lineIndex].trim();
		if (!trimmed) {
			lineIndex -= 1;
			continue;
		}
		if (trimmed.startsWith("/**")) {
			return true;
		}
		if (trimmed.startsWith("/*")) {
			return false;
		}
		if (trimmed.startsWith("*")) {
			lineIndex -= 1;
			continue;
		}
		if (trimmed.endsWith("*/")) {
			lineIndex -= 1;
			continue;
		}
		return false;
	}

	return false;
}

function isTopLevelJsDeclaration(trimmedLine) {
	for (const pattern of FUNCTION_DECLARATION_PATTERNS) {
		if (pattern.test(trimmedLine)) {
			return true;
		}
	}

	for (const pattern of CLASS_DECLARATION_PATTERNS) {
		if (pattern.test(trimmedLine)) {
			return true;
		}
	}

	return false;
}

function scanJsTsDocumentation(relativePath, content, documentationHits) {
	const lines = content.split(/\r?\n/);

	if (!hasJsTsModuleDoc(lines)) {
		documentationHits.push(`${relativePath}:1 module missing top-level JSDoc`);
	}

	for (let index = 0; index < lines.length; index += 1) {
		const rawLine = lines[index];
		const trimmed = rawLine.trim();

		if (!trimmed || rawLine !== trimmed) {
			continue;
		}
		if (!isTopLevelJsDeclaration(trimmed)) {
			continue;
		}
		if (hasJSDocAbove(lines, index)) {
			continue;
		}

		documentationHits.push(
			`${relativePath}:${index + 1} declaration missing leading JSDoc`,
		);
	}
}

function isPythonDocLine(line) {
	if (line.startsWith('"""')) {
		return true;
	}
	if (line.startsWith("'''")) {
		return true;
	}
	return false;
}

function hasPythonModuleDoc(lines) {
	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			continue;
		}
		if (trimmed.startsWith("#!")) {
			continue;
		}
		if (trimmed.startsWith("#")) {
			continue;
		}

		return isPythonDocLine(trimmed);
	}

	return true;
}

function hasPythonDocBelow(lines, declarationLineIndex) {
	for (let index = declarationLineIndex + 1; index < lines.length; index += 1) {
		const rawLine = lines[index];
		const trimmed = rawLine.trim();

		if (!trimmed) {
			continue;
		}
		if (rawLine === trimmed) {
			return false;
		}
		if (trimmed.startsWith("#")) {
			continue;
		}
		if (isPythonDocLine(trimmed)) {
			return true;
		}
		return false;
	}

	return false;
}

function scanPythonDocumentation(relativePath, content, documentationHits) {
	const lines = content.split(/\r?\n/);

	if (!hasPythonModuleDoc(lines)) {
		documentationHits.push(
			`${relativePath}:1 module missing top-level docstring`,
		);
	}

	for (let index = 0; index < lines.length; index += 1) {
		const rawLine = lines[index];
		const trimmed = rawLine.trim();

		if (!trimmed || rawLine !== trimmed) {
			continue;
		}
		if (!trimmed.endsWith(":")) {
			continue;
		}

		const isFunction = /^def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmed);
		const isClass = /^class\s+[A-Za-z_][A-Za-z0-9_]*\b/.test(trimmed);
		if (!isFunction && !isClass) {
			continue;
		}

		if (hasPythonDocBelow(lines, index)) {
			continue;
		}

		documentationHits.push(
			`${relativePath}:${index + 1} declaration missing leading docstring`,
		);
	}
}

function printSection(title, entries) {
	process.stdout.write(`\n${title}: ${entries.length}\n`);
	for (const entry of entries) {
		process.stdout.write(`- ${entry.path} (${entry.lines} lines)\n`);
	}
}

function printHitSection(title, hits) {
	process.stdout.write(`\n${title}: ${hits.length}\n`);
	for (const hit of hits) {
		process.stdout.write(`- ${hit}\n`);
	}
}

function run() {
	const overSoftLimit = [];
	const overHardLimit = [];
	const typesUnderMinimum = [];
	const ternaryHits = [];
	const consoleHits = [];
	const typeDefinitionHits = [];
	const documentationHits = [];

	let analyzed = 0;
	let underSoft = 0;
	let typesAnalyzed = 0;
	let typesAtOrAboveMinimum = 0;

	for (const filePath of collectFiles()) {
		const extension = path.extname(filePath);
		const relativePath = toRelative(filePath);

		if (shouldSkipFile(relativePath)) {
			continue;
		}

		const content = fs.readFileSync(filePath, "utf8");
		const lineCount = countCodeLines(content, extension);

		analyzed += 1;
		if (lineCount < SOFT_LINE_LIMIT) {
			underSoft += 1;
		}
		if (lineCount > SOFT_LINE_LIMIT) {
			overSoftLimit.push({ path: relativePath, lines: lineCount });
		}
		if (lineCount > HARD_LINE_LIMIT && !isElectronTypesPath(relativePath)) {
			overHardLimit.push({ path: relativePath, lines: lineCount });
		}
		if (isElectronTypesPath(relativePath)) {
			typesAnalyzed += 1;
			if (lineCount >= TYPES_MIN_LINE_LIMIT) {
				typesAtOrAboveMinimum += 1;
			} else {
				typesUnderMinimum.push({ path: relativePath, lines: lineCount });
			}
		}

		if (JS_TS_EXTENSIONS.has(extension)) {
			scanJsTs(
				relativePath,
				content,
				extension,
				ternaryHits,
				consoleHits,
				typeDefinitionHits,
			);
			scanJsTsDocumentation(relativePath, content, documentationHits);
			continue;
		}

		if (extension === ".py") {
			scanPythonDocumentation(relativePath, content, documentationHits);
		}
	}

	sortByLines(overSoftLimit);
	sortByLines(overHardLimit);
	sortByLinesAscending(typesUnderMinimum);

	let underSoftPercent = 100;
	let typesAtOrAboveMinimumPercent = 100;
	if (analyzed > 0) {
		underSoftPercent = (underSoft / analyzed) * 100;
	}
	if (typesAnalyzed > 0) {
		typesAtOrAboveMinimumPercent =
			(typesAtOrAboveMinimum / typesAnalyzed) * 100;
	}

	process.stdout.write("Style audit report\n");
	process.stdout.write(`Analyzed files: ${analyzed}\n`);
	process.stdout.write(
		`Files under ${SOFT_LINE_LIMIT} lines: ${underSoft}/${analyzed} (${underSoftPercent.toFixed(1)}%)\n`,
	);
	process.stdout.write(
		`electron/types files at or above ${TYPES_MIN_LINE_LIMIT} lines: ${typesAtOrAboveMinimum}/${typesAnalyzed} (${typesAtOrAboveMinimumPercent.toFixed(1)}%)\n`,
	);

	printSection(`Files over ${SOFT_LINE_LIMIT} lines`, overSoftLimit);
	printSection(`Files over ${HARD_LINE_LIMIT} lines`, overHardLimit);
	printSection(
		`electron/types files under ${TYPES_MIN_LINE_LIMIT} code lines`,
		typesUnderMinimum,
	);
	printHitSection("Ternary expressions", ternaryHits);
	printHitSection("Disallowed console methods", consoleHits);
	printHitSection(
		"Type/interface definitions outside types folders",
		typeDefinitionHits,
	);
	printHitSection("Probable documentation gaps", documentationHits);

	const failures = [];
	if (overHardLimit.length > 0) {
		failures.push(
			`Files over ${HARD_LINE_LIMIT} lines: ${overHardLimit.length}`,
		);
	}
	if (underSoftPercent < MIN_UNDER_SOFT_PERCENT) {
		failures.push(
			`Files under ${SOFT_LINE_LIMIT} lines below ${MIN_UNDER_SOFT_PERCENT}%: ${underSoftPercent.toFixed(1)}%`,
		);
	}
	if (typesUnderMinimum.length > 0) {
		failures.push(
			`electron/types files under ${TYPES_MIN_LINE_LIMIT} lines: ${typesUnderMinimum.length}`,
		);
	}
	if (ternaryHits.length > 0) {
		failures.push(`Ternary expressions found: ${ternaryHits.length}`);
	}
	if (consoleHits.length > 0) {
		failures.push(`Disallowed console methods found: ${consoleHits.length}`);
	}

	if (failures.length > 0) {
		process.stderr.write("\nAudit failed:\n");
		for (const failure of failures) {
			process.stderr.write(`- ${failure}\n`);
		}
		process.exitCode = 1;
		return;
	}

	process.stdout.write("\nAudit passed.\n");
}

run();
