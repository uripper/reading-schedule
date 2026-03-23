/** Documentation checks for JavaScript, TypeScript, and Python files. */
import {
	CLASS_DECLARATION_PATTERNS,
	FUNCTION_DECLARATION_PATTERNS,
} from "./config.mjs";
import {
	isDeclarationFile,
	isTestCoverageTestFile,
} from "./path_rules.mjs";

const isJsTsModuleDocLine = (line) => {
	return line.startsWith("/**");
};

const hasJsTsModuleDoc = (lines) => {
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
};

const hasJSDocAbove = (lines, declarationLineIndex) => {
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
};

const isTopLevelJsDeclaration = (trimmedLine) => {
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
};

export const scanJsTsDocumentation = (
	relativePath,
	content,
	documentationHits,
) => {
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
};

const isPythonDocLine = (line) => {
	if (line.startsWith('"""')) {
		return true;
	}
	if (line.startsWith("'''")) {
		return true;
	}
	return false;
};

const hasPythonModuleDoc = (lines) => {
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
};

const hasPythonDocBelow = (lines, declarationLineIndex) => {
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
};

export const scanPythonDocumentation = (
	relativePath,
	content,
	documentationHits,
) => {
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
};
