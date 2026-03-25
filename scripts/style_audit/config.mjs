/** Shared constants for the style audit pipeline. */
export const SOURCE_ROOTS = [
	"apps",
	"packages",
	"scripts",
	"mobile/src",
];

export const CODE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".py",
]);

export const JS_TS_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
]);

export const TS_EXTENSIONS = new Set([".ts", ".tsx"]);

export const IGNORED_DIRECTORIES = new Set([
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

export const IGNORED_FILES = new Set(["eslint.config.mjs", "style_audit.mjs"]);

export const SOFT_LINE_LIMIT = 200;
export const HARD_LINE_LIMIT = 300;
export const MIN_UNDER_SOFT_PERCENT = 90;
export const MIN_LINE_LIMIT = 30;
export const MAX_UNDER_MIN_LINE_PERCENT = 10;
export const MIN_TYPE_COVERAGE_PERCENT = 90;
export const MIN_TEST_COVERAGE_PERCENT = 90;

export const AUDIT_SELF_PATH = "scripts/style_audit.mjs";
export const CONTRACTS_ROOT = "packages/contracts/";
export const CONTRACTS_FIRST_AUDIT_PREFIXES = [
	"apps/bartleby/src/",
	"apps/website/src/",
	"mobile/src/",
	"packages/frontend/src/",
];

export const DISALLOWED_CONSOLE_PATTERN = /\bconsole\.(error|warn|log|debug)\s*\(/g;
export const LOCAL_TYPE_AUDIT_ALLOW_PATTERN =
	/(?:\/\/|\/\*+|\*)\s*audit-allow-local-types\s*:\s*([^\n*]+)/;

export const TYPE_COVERAGE_CHECKS = [
	{
		label: "bartleby app strict",
		project: "apps/bartleby/tsconfig.json",
	},
	{
		label: "shared frontend strict",
		project: "packages/frontend/tsconfig.json",
	},
	{
		label: "website strict",
		project: "apps/website/tsconfig.json",
	},
];

export const TEST_COVERAGE_AREAS = [
	{
		label: "Desktop frontend",
		sourcePrefixes: ["apps/bartleby/src/", "packages/frontend/src/"],
		testPrefixes: ["packages/frontend/tests/"],
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

export const FUNCTION_DECLARATION_PATTERNS = [
	/^(export\s+)?(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
	/^export\s+default\s+(async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/,
];

export const CLASS_DECLARATION_PATTERNS = [
	/^(export\s+)?(abstract\s+)?class\s+[A-Za-z_$][\w$]*\b/,
	/^export\s+default\s+(abstract\s+)?class\s+[A-Za-z_$][\w$]*\b/,
];
