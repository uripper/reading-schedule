/** JavaScript and TypeScript rule checks for the style audit. */
import ts from "typescript";

import {
	DISALLOWED_CONSOLE_PATTERN,
	LOCAL_TYPE_AUDIT_ALLOW_PATTERN,
	TS_EXTENSIONS,
} from "./config.mjs";
import {
	isContractsFirstAuditPath,
	isContractsPath,
	isDeclarationFile,
	isInTypesDirectory,
} from "./path_rules.mjs";
import { stripLineComment } from "./line_rules.mjs";

const STRING_LITERAL_PATTERN = /(['"`])(?:\\.|(?!\1).)*\1/g;

const scriptKindForExtension = (extension) => {
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
};

const parseJsTsSource = (relativePath, content, extension) => {
	return ts.createSourceFile(
		relativePath,
		content,
		ts.ScriptTarget.Latest,
		true,
		scriptKindForExtension(extension),
	);
};

const walkNodes = (rootNode, visitNode) => {
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
};

const pushTernaryHits = (relativePath, sourceFile, ternaryHits) => {
	walkNodes(sourceFile, (node) => {
		if (ts.isConditionalExpression(node)) {
			const position = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile),
			);
			ternaryHits.push(`${relativePath}:${position.line + 1}`);
		}
	});
};

const hasExportModifier = (node) => {
	return (node.modifiers ?? []).some((modifier) => {
		return modifier.kind === ts.SyntaxKind.ExportKeyword;
	});
};

const localTypeAuditWaiverReason = (content) => {
	const match = content.match(LOCAL_TYPE_AUDIT_ALLOW_PATTERN);
	if (match === null) {
		return "";
	}
	return match[1].trim();
};

const typeDeclarationSummary = (relativePath, sourceFile) => {
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
};

const pushTypeDeclarationHit = (options) => {
	if (options.count === 0 || options.lineNumber === 0) {
		return;
	}
	options.typeHits.push(
		`${options.relativePath}:${options.lineNumber} ${options.count} ${options.suffix}`,
	);
};

const pushTypeDefinitionHitsOutsideContracts = (options) => {
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
		typeHits: options.typeDefinitionOutsideContractsHits,
	});
};

const pushLocalTypeWaiverHits = (options) => {
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
		typeHits: options.localTypeWaiverHits,
	});
};

const scanTsTypePlacement = (options) => {
	if (!isContractsFirstAuditPath(options.relativePath)) {
		return;
	}

	const summary = typeDeclarationSummary(options.relativePath, options.sourceFile);
	const waiverReason = localTypeAuditWaiverReason(options.content);

	pushTypeDefinitionHitsOutsideContracts({
		relativePath: options.relativePath,
		summary,
		typeDefinitionOutsideContractsHits: options.typeDefinitionOutsideContractsHits,
	});
	pushLocalTypeWaiverHits({
		relativePath: options.relativePath,
		summary,
		localTypeWaiverHits: options.localTypeWaiverHits,
		waiverReason,
	});
};

const scanConsoleHits = (options) => {
	const lines = options.content.split(/\r?\n/);
	let lineNumber = 1;

	for (const rawLine of lines) {
		const line = stripLineComment(rawLine).replace(STRING_LITERAL_PATTERN, "");

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
};

export const scanJsTsFile = (options) => {
	scanConsoleHits(options);

	const sourceFile = parseJsTsSource(
		options.relativePath,
		options.content,
		options.extension,
	);
	pushTernaryHits(options.relativePath, sourceFile, options.ternaryHits);

	if (TS_EXTENSIONS.has(options.extension)) {
		scanTsTypePlacement({
			content: options.content,
			relativePath: options.relativePath,
			sourceFile,
			typeDefinitionOutsideContractsHits:
				options.typeDefinitionOutsideContractsHits,
			localTypeWaiverHits: options.localTypeWaiverHits,
		});
	}
};
