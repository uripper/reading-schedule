/** Path classification helpers for style audits. */
import path from "node:path";

import {
	AUDIT_SELF_PATH,
	CONTRACTS_FIRST_AUDIT_PREFIXES,
	CONTRACTS_ROOT,
} from "./config.mjs";

export const toRelative = (filePath) => {
	return path.relative(process.cwd(), filePath).split(path.sep).join("/");
};

export const shouldSkipFile = (relativePath) => {
	return relativePath === AUDIT_SELF_PATH;
};

export const isDeclarationFile = (relativePath) => {
	return relativePath.endsWith(".d.ts");
};

export const isContractsPath = (relativePath) => {
	return relativePath.startsWith(CONTRACTS_ROOT);
};

export const isTypeDirectoryPath = (relativePath) => {
	return relativePath.split("/").some((segment) => {
		return segment === "types" || segment.startsWith("types_");
	});
};

export const isInTypesDirectory = (relativePath) => {
	return isTypeDirectoryPath(relativePath);
};

export const isPathUnderPrefixes = (relativePath, prefixes) => {
	return prefixes.some((prefix) => {
		return relativePath.startsWith(prefix);
	});
};

export const isTestCoverageTestFile = (relativePath) => {
	const baseName = path.basename(relativePath);

	if (
		relativePath.startsWith("tests/") ||
		relativePath.includes("/tests/")
	) {
		return true;
	}

	if (relativePath.endsWith(".py")) {
		return baseName.startsWith("test_");
	}

	return baseName.includes(".test.");
};

export const isTestPath = (relativePath) => {
	return (
		relativePath.startsWith("tests/") ||
		relativePath.includes("/tests/") ||
		isTestCoverageTestFile(relativePath)
	);
};

export const isContractsFirstAuditPath = (relativePath) => {
	return (
		!isTestPath(relativePath) &&
		CONTRACTS_FIRST_AUDIT_PREFIXES.some((prefix) => {
			return relativePath.startsWith(prefix);
		})
	);
};

export const isTestCoverageSourceFile = (relativePath) => {
	return (
		!isDeclarationFile(relativePath) &&
		path.basename(relativePath) !== "__init__.py"
	);
};
