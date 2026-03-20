#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as typeCoverageCore from "type-coverage-core";
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
const MIN_LINE_LIMIT = 30;
const MAX_UNDER_MIN_LINE_PERCENT = 10;
const MIN_TYPE_COVERAGE_PERCENT = 90;
const MIN_TEST_COVERAGE_PERCENT = 90;

const AUDIT_SELF_PATH = "scripts/style_audit.mjs";
const CONTRACTS_ROOT = "packages/contracts/";
const CONTRACTS_FIRST_AUDIT_PREFIXES = [
	"electron/",
	"apps/website/src/",
	"mobile/src/",

];
const DISALLOWED_CONSOLE_PATTERN = /\bconsole\.(error|warn|log|debug)\s*\(/g;
const LOCAL_TYPE_AUDIT_ALLOW_PATTERN =
    /(?:\/\/|\/\*+|\*)\s*audit-allow-local-types\s*:\s*([^\n*]+)/;
const TYPE_COVERAGE_CHECKS = [
	{
		label: "electron main strict",
		project: "electron/tsconfig.main.json",
	},
	{
		label: "electron renderer strict",
		project: "electron/tsconfig.renderer.json",
	},
];
const TEST_COVERAGE_AREAS = [
	{
		label: "Python planner",
		sourcePrefixes: ["src/reading_plan/"],
		testPrefixes: ["tests/"],
	},
	{
		label: "Electron desktop",
		sourcePrefixes: ["electron/main/", "electron/renderer/"],
		testPrefixes: ["electron/tests/"],
	},
	{
		label: "Website",
		sourcePrefixes: ["apps/website/src/"],
		testPrefixes: ["apps/website/tests/"],
	},
	{
		label: "Mobile app",
		sourcePrefixes: ["mobile/src/"],
		testPrefixes: ["mobile/src/", "mobile/tests/"],
	},
];

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
	return segments.some((segment) => {
		return segment === "types" || segment.startsWith("types_");
	});
}

function isDeclarationFile(relativePath) {
	return relativePath.endsWith(".d.ts");
}

function isContractsPath(relativePath) {
	return relativePath.startsWith(CONTRACTS_ROOT);
}

function hasExportModifier(node) {
	return (node.modifiers ?? []).some((modifier) => {
		return modifier.kind === ts.SyntaxKind.ExportKeyword;
	});
}

function localTypeAuditWaiverReason(content) {
	const match = content.match(LOCAL_TYPE_AUDIT_ALLOW_PATTERN);
	if (match === null) {
		return "";
	}
	return match[1].trim();
}

function typeDeclarationSummary(relativePath, sourceFile) {
	if (relativePath.startsWith("electron/tokens/dist/")) {
		return null;
	}

	let declarationCount = 0;
	let exportedDeclarationCount = 0;
	let firstLine = 0;
	let firstExportedLine = 0;

	walkNodes(sourceFile, (node) => {
		if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
			declarationCount += 1;
			if (firstLine === 0) {
				const position = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(sourceFile),
				);
				firstLine = position.line + 1;
			}
			if (isDeclarationFile(relativePath) || hasExportModifier(node)) {
				exportedDeclarationCount += 1;
				if (firstExportedLine === 0) {
					const position = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					firstExportedLine = position.line + 1;
				}
			}
		}
	});

	if (declarationCount === 0) {
		return null;
	}

	return {
		declarationCount,
		exportedDeclarationCount,
		firstExportedLine,
		firstLine,
	};
}

function pushTypeDeclarationHit(options) {
	if (options.count === 0 || options.lineNumber === 0) {
		return;
	}
	options.typeHits.push(
		`${options.relativePath}:${options.lineNumber} ${options.count} ${options.suffix}`,
	);
}

function pushTypeDefinitionHitsOutsideContracts(options) {
	if (options.summary === null) {
		return;
	}
	if (isContractsPath(options.relativePath)) {
		return;
	}
	pushTypeDeclarationHit({
		count: options.summary.exportedDeclarationCount,
		lineNumber: options.summary.firstExportedLine,
		relativePath: options.relativePath,
		suffix: "exported type/interface declarations",
		typeHits: options.typeHits,
	});
}

function pushLocalTypeWaiverHits(options) {
	if (options.summary === null) {
		return;
	}
	if (isInTypesDirectory(options.relativePath)) {
		return;
	}
	if (isContractsPath(options.relativePath)) {
		return;
	}
	if (options.waiverReason !== "") {
		return;
	}
	pushTypeDeclarationHit({
		count: options.summary.declarationCount,
		lineNumber: options.summary.firstLine,
		relativePath: options.relativePath,
		suffix: "type/interface declarations without audit-allow-local-types waiver",
		typeHits: options.typeHits,
	});
}

function scanTsTypePlacement(options) {
	if (!isContractsFirstAuditPath(options.relativePath)) {
		return;
	}
	const summary = typeDeclarationSummary(options.relativePath, options.sourceFile);
	const waiverReason = localTypeAuditWaiverReason(options.content);
	pushTypeDefinitionHitsOutsideContracts({
		relativePath: options.relativePath,
		summary,
		typeHits: options.typeDefinitionOutsideContractsHits,
		waiverReason,
	});
	pushLocalTypeWaiverHits({
		relativePath: options.relativePath,
		summary,
		typeHits: options.localTypeWaiverHits,
		waiverReason,
	});
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

function isBarrelModule(content, extension) {
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
}

function isMinimumLineCountExempt(relativePath, content, extension) {
	// Package marker modules are intentionally tiny, so they should not
	// count as "combine these files" candidates in the cohesion audit.
	return path.basename(relativePath) === "__init__.py";
}

function hasMinimumLineCountExemption(relativePath, content, extension) {
	if (isMinimumLineCountExempt(relativePath, content, extension)) {
		return true;
	}
	if (isDeclarationFile(relativePath)) {
		return true;
	}
	if (isTestCoverageTestFile(relativePath)) {
		// Focused regression tests are often small on purpose, so treating them
		// as cohesion failures discourages exactly the kind of narrow tests we
		// want contributors to add.
		return true;
	}
	if (isBarrelModule(content, extension)) {
		// Export-only barrel files and contract shims are boundary modules rather
		// than "too-small features", so they should not count against the minimum.
		return true;
	}
	return false;
}

function scanJsTs(options) {
	const lines = options.content.split(/\r?\n/);
	let lineNumber = 1;

	for (const rawLine of lines) {
		const line = stripLineComment(rawLine).replace(
			/(['"`])(?:\\.|(?!\1).)*\1/g,
			"",
		);

		let match = DISALLOWED_CONSOLE_PATTERN.exec(line);
		while (match !== null) {
			options.consoleHits.push(
				`${options.relativePath}:${lineNumber} console.${match[1]}`,
			);
			match = DISALLOWED_CONSOLE_PATTERN.exec(line);
		}
		DISALLOWED_CONSOLE_PATTERN.lastIndex = 0;

		lineNumber += 1;
	}

	const sourceFile = parseJsTsSource(
		options.relativePath,
		options.content,
		options.extension,
	);
	pushTernaryHits(options.relativePath, sourceFile, options.ternaryHits);

	if (TS_EXTENSIONS.has(options.extension)) {
		scanTsTypePlacement({
			content: options.content,
			localTypeWaiverHits: options.localTypeWaiverHits,
			relativePath: options.relativePath,
			sourceFile,
			typeDefinitionOutsideContractsHits:
				options.typeDefinitionOutsideContractsHits,
		});
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
	if (isDeclarationFile(relativePath) || isTestCoverageTestFile(relativePath)) {
		return;
	}

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

function formatTypeCoveragePercent(correctCount, totalCount) {
	if (totalCount === 0) {
		return "100.00";
	}

	return (Math.floor((correctCount * 10000) / totalCount) / 100).toFixed(2);
}

function isPathUnderPrefixes(relativePath, prefixes) {
	return prefixes.some((prefix) => relativePath.startsWith(prefix));
}

function isTestCoverageSourceFile(relativePath) {
	if (relativePath.endsWith(".d.ts")) {
		return false;
	}
	return path.basename(relativePath) !== "__init__.py";
}

function isTestCoverageTestFile(relativePath) {
	const baseName = path.basename(relativePath);
	if (relativePath.endsWith(".py")) {
		return baseName.startsWith("test_");
	}
	return baseName.includes(".test.");
}

function isTestPath(relativePath) {
	if (relativePath.startsWith("tests/")) {
		return true;
	}
	if (relativePath.includes("/tests/")) {
		return true;
	}
	return isTestCoverageTestFile(relativePath);
}

function isContractsFirstAuditPath(relativePath) {
	if (isTestPath(relativePath)) {
		return false;
	}
	return CONTRACTS_FIRST_AUDIT_PREFIXES.some((prefix) => {
		return relativePath.startsWith(prefix);
	});
}

function formatTestCoveragePercent(testCount, sourceCount) {
	if (sourceCount === 0) {
		return "100.0";
	}

	return ((testCount * 100) / sourceCount).toFixed(1);
}

function numericCoveragePercent(correctCount, totalCount) {
	if (totalCount === 0) {
		return 100;
	}

	return (correctCount * 100) / totalCount;
}

function runTestCoverageAudit(relativePaths) {
	const hits = [];
	const areas = [];
	let totalSourceCount = 0;
	let totalTestCount = 0;
	let zeroTestAreas = 0;

	// The repo does not yet have a unified cross-language line-coverage runner,
	// so the audit reports test-surface coverage by area to keep obvious gaps
	// visible during review.
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

	return { areas, hits, totalSourceCount, totalTestCount, zeroTestAreas };
}

async function runTypeCoverageAudit() {
	const { lint: typeCoverageLint } = typeCoverageCore;
	const entries = [];
	const hits = [];
	const failures = [];
	let totalCorrectCount = 0;
	let totalCount = 0;
	let totalUncovered = 0;

	for (const check of TYPE_COVERAGE_CHECKS) {
		// Strict coverage highlights assertions and implicit type holes that
		// ordinary typechecking can miss, so the audit surfaces the summary here.
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
			const percent = formatTypeCoveragePercent(
				summary.correctCount,
				summary.totalCount,
			);
			const uncovered = summary.totalCount - summary.correctCount;
			totalUncovered += uncovered;
			hits.push(
				`${check.label}: ${percent}% (${summary.correctCount}/${summary.totalCount}, ${uncovered} uncovered)`,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
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
}

async function run() {
	const overSoftLimit = [];
	const overHardLimit = [];
	const filesUnderMinimum = [];
	const ternaryHits = [];
	const consoleHits = [];
	const typeDefinitionOutsideContractsHits = [];
	const localTypeWaiverHits = [];
	const documentationHits = [];

	let analyzed = 0;
	let underSoft = 0;
	let minimumLineFilesAnalyzed = 0;
	let filesAtOrAboveMinimum = 0;
	const analyzedRelativePaths = [];

	for (const filePath of collectFiles()) {
		const extension = path.extname(filePath);
		const relativePath = toRelative(filePath);

		if (shouldSkipFile(relativePath)) {
			continue;
		}

		const content = fs.readFileSync(filePath, "utf8");
		const lineCount = countCodeLines(content, extension);
		analyzedRelativePaths.push(relativePath);

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

		if (!hasMinimumLineCountExemption(relativePath, content, extension)) {
			minimumLineFilesAnalyzed += 1;
			if (lineCount >= MIN_LINE_LIMIT) {
				filesAtOrAboveMinimum += 1;
			} else {
				filesUnderMinimum.push({ path: relativePath, lines: lineCount });
			}
		}

		if (JS_TS_EXTENSIONS.has(extension)) {
			scanJsTs({
				consoleHits,
				content,
				extension,
				localTypeWaiverHits,
				relativePath,
				ternaryHits,
				typeDefinitionOutsideContractsHits,
			});
			scanJsTsDocumentation(relativePath, content, documentationHits);
			continue;
		}

		if (extension === ".py") {
			scanPythonDocumentation(relativePath, content, documentationHits);
		}
	}

	sortByLines(overSoftLimit);
	sortByLines(overHardLimit);
	sortByLinesAscending(filesUnderMinimum);

	const typeCoverageAudit = await runTypeCoverageAudit();
	const testCoverageAudit = runTestCoverageAudit(analyzedRelativePaths);

	let underSoftPercent = 100;
	let filesAtOrAboveMinimumPercent = 100;
	let filesUnderMinimumPercent = 0;
	if (analyzed > 0) {
		underSoftPercent = (underSoft / analyzed) * 100;
	}
	if (minimumLineFilesAnalyzed > 0) {
		filesAtOrAboveMinimumPercent =
			(filesAtOrAboveMinimum / minimumLineFilesAnalyzed) * 100;
		filesUnderMinimumPercent =
			(filesUnderMinimum.length / minimumLineFilesAnalyzed) * 100;
	}

	process.stdout.write("Style audit report\n");
	process.stdout.write(`Analyzed files: ${analyzed}\n`);
	process.stdout.write(
		`Files under ${SOFT_LINE_LIMIT} lines: ${underSoft}/${analyzed} (${underSoftPercent.toFixed(1)}%)\n`,
	);
	process.stdout.write(
		`Files at or above ${MIN_LINE_LIMIT} lines: ${filesAtOrAboveMinimum}/${minimumLineFilesAnalyzed} (${filesAtOrAboveMinimumPercent.toFixed(1)}%)\n`,
	);

	printSection(`Files over ${SOFT_LINE_LIMIT} lines`, overSoftLimit);
	printSection(`Files over ${HARD_LINE_LIMIT} lines`, overHardLimit);
	printSection(
		`Files under ${MIN_LINE_LIMIT} code lines`,
		filesUnderMinimum,
	);
	printHitSection("Ternary expressions", ternaryHits);
	printHitSection("Disallowed console methods", consoleHits);
	printHitSection(
		"Type/interface definitions outside packages/contracts",
		typeDefinitionOutsideContractsHits,
	);
	printHitSection(
		"Local type/interface definitions without audit-allow-local-types waiver",
		localTypeWaiverHits,
	);
	printHitSection("Type coverage", typeCoverageAudit.hits);
	printHitSection("Test coverage surface", testCoverageAudit.hits);
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
	if (filesUnderMinimumPercent > MAX_UNDER_MIN_LINE_PERCENT) {
		failures.push(
			`Files under ${MIN_LINE_LIMIT} lines above ${MAX_UNDER_MIN_LINE_PERCENT}%: ${filesUnderMinimum.length}/${minimumLineFilesAnalyzed} (${filesUnderMinimumPercent.toFixed(1)}%)`,
		);
	}
	if (ternaryHits.length > 0) {
		failures.push(`Ternary expressions found: ${ternaryHits.length}`);
	}
	if (consoleHits.length > 0) {
		failures.push(`Disallowed console methods found: ${consoleHits.length}`);
	}
	if (typeDefinitionOutsideContractsHits.length > 0) {
		failures.push(
			`Type/interface definitions outside packages/contracts: ${typeDefinitionOutsideContractsHits.length}`,
		);
	}
	if (localTypeWaiverHits.length > 0) {
		failures.push(
			`Local type/interface definitions without audit-allow-local-types waiver: ${localTypeWaiverHits.length}`,
		);
	}
	if (documentationHits.length > 0) {
		failures.push(`Probable documentation gaps: ${documentationHits.length}`);
	}
	failures.push(...typeCoverageAudit.failures);
	if (typeCoverageAudit.failures.length === 0) {
		const typeCoveragePercent = numericCoveragePercent(
			typeCoverageAudit.totalCorrectCount,
			typeCoverageAudit.totalCount,
		);
		if (typeCoveragePercent < MIN_TYPE_COVERAGE_PERCENT) {
			failures.push(
				`Type coverage below ${MIN_TYPE_COVERAGE_PERCENT}%: ${formatTypeCoveragePercent(typeCoverageAudit.totalCorrectCount, typeCoverageAudit.totalCount)}%`,
			);
		}
	}
	const testCoveragePercent = numericCoveragePercent(
		testCoverageAudit.totalTestCount,
		testCoverageAudit.totalSourceCount,
	);
	if (testCoveragePercent < MIN_TEST_COVERAGE_PERCENT) {
		failures.push(
			`Test coverage surface below ${MIN_TEST_COVERAGE_PERCENT}%: ${formatTestCoveragePercent(testCoverageAudit.totalTestCount, testCoverageAudit.totalSourceCount)}%`,
		);
	}
	const summaryLines = [
		`Files under ${SOFT_LINE_LIMIT} lines: ${underSoft}/${analyzed} (${underSoftPercent.toFixed(1)}%)`,
		`Files over ${SOFT_LINE_LIMIT} lines: ${overSoftLimit.length}`,
		`Files over ${HARD_LINE_LIMIT} lines: ${overHardLimit.length}`,
		`Files under ${MIN_LINE_LIMIT} lines: ${filesUnderMinimum.length}/${minimumLineFilesAnalyzed} (${filesUnderMinimumPercent.toFixed(1)}%)`,
		`Ternary expressions: ${ternaryHits.length}`,
		`Disallowed console methods: ${consoleHits.length}`,
		`Type/interface definitions outside packages/contracts: ${typeDefinitionOutsideContractsHits.length}`,
		`Local type/interface definitions without audit-allow-local-types waiver: ${localTypeWaiverHits.length}`,
		`Probable documentation gaps: ${documentationHits.length}`,
	];
	if (typeCoverageAudit.failures.length === 0) {
		const typeCoveragePercent = formatTypeCoveragePercent(
			typeCoverageAudit.totalCorrectCount,
			typeCoverageAudit.totalCount,
		);
		summaryLines.push(
			`Type coverage: ${typeCoveragePercent}% (${typeCoverageAudit.totalUncovered} uncovered across ${typeCoverageAudit.entries.length} targets)`,
		);
	} else {
		summaryLines.push(
			`Type coverage: ${typeCoverageAudit.failures.length} coverage command failures`,
		);
	}
	summaryLines.push(
		`Test coverage surface: ${testCoverageAudit.totalTestCount} test files for ${testCoverageAudit.totalSourceCount} source files (${formatTestCoveragePercent(testCoverageAudit.totalTestCount, testCoverageAudit.totalSourceCount)}%), ${testCoverageAudit.zeroTestAreas} areas with zero tests`,
	);

	if (failures.length > 0) {
		process.stderr.write("\nAudit failed:\n");
		for (const summaryLine of summaryLines) {
			process.stderr.write(`- ${summaryLine}\n`);
		}
		process.stderr.write("\nBlocking failures:\n");
		for (const failure of failures) {
			process.stderr.write(`- ${failure}\n`);
		}
		process.exitCode = 1;
		return;
	}

	process.stdout.write("\nAudit passed.\n");
}

run().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`Audit failed unexpectedly: ${message}\n`);
	process.exitCode = 1;
});
