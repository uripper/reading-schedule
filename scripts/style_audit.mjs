#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const SOURCE_ROOTS = [
  "src",
  "electron",
  "apps",
  "packages",
  "services",
  "scripts",
  "tests",
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
const SOFT_LINE_LIMIT = 100;
const HARD_LINE_LIMIT = 200;
const MIN_UNDER_SOFT_PERCENT = 90;
const ENFORCED_UNDER_SOFT_PERCENT = 72.8;
const DISALLOWED_CONSOLE_PATTERN = /\bconsole\.(error|warn|log|debug)\s*\(/g;
function toRelative(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}
function countLines(content) {
  if (content.length === 0) {
    return 0;
  }
  let count = 0;
  for (const char of content) {
    if (char === "\n") {
      count += 1;
    }
  }
  if (content.endsWith("\n")) {
    return count;
  }
  count += 1;
  return count;
}
function stripLineComment(line) {
  const commentIndex = line.indexOf("//");
  if (commentIndex < 0) {
    return line;
  }
  return line.slice(0, commentIndex);
}
function hasProbableTernary(line) {
  if (!line.includes("?") || !line.includes(":")) {
    return false;
  }
  let questionIndex = line.indexOf("?");
  while (questionIndex >= 0) {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= line.length) {
      break;
    }
    const nextChar = line[nextIndex];
    if (nextChar !== "." && nextChar !== "?" && nextChar !== ":") {
      const colonIndex = line.indexOf(":", nextIndex);
      if (colonIndex >= 0) {
        return true;
      }
    }
    questionIndex = line.indexOf("?", nextIndex);
  }
  return false;
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
function shouldSkipFile(relativePath, extension) {
  return extension === ".mjs" && relativePath.split("/").includes("scripts");
}
function scanJsTs(relativePath, content, ternaryHits, consoleHits) {
  const lines = content.split(/\r?\n/);
  let lineNumber = 1;
  for (const rawLine of lines) {
    const line = stripLineComment(rawLine).replace(
      /(['"`])(?:\\.|(?!\1).)*\1/g,
      "",
    );
    if (hasProbableTernary(line)) {
      ternaryHits.push(`${relativePath}:${lineNumber}`);
    }
    let match = DISALLOWED_CONSOLE_PATTERN.exec(line);
    while (match !== null) {
      consoleHits.push(`${relativePath}:${lineNumber} console.${match[1]}`);
      match = DISALLOWED_CONSOLE_PATTERN.exec(line);
    }
    DISALLOWED_CONSOLE_PATTERN.lastIndex = 0;
    lineNumber += 1;
  }
}
function printSection(title, entries) {
  process.stdout.write(`\n${title}: ${entries.length}\n`);
  for (const entry of entries) {
    process.stdout.write(`- ${entry.path} (${entry.lines} lines)\n`);
  }
}
function run() {
  const overSoftLimit = [];
  const overHardLimit = [];
  const ternaryHits = [];
  const consoleHits = [];
  let analyzed = 0;
  let underSoft = 0;
  for (const filePath of collectFiles()) {
    const extension = path.extname(filePath);
    const relativePath = toRelative(filePath);
    if (shouldSkipFile(relativePath, extension)) {
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const lineCount = countLines(content);
    analyzed += 1;
    if (lineCount < SOFT_LINE_LIMIT) {
      underSoft += 1;
    }
    if (lineCount > SOFT_LINE_LIMIT) {
      overSoftLimit.push({ path: relativePath, lines: lineCount });
    }
    if (lineCount > HARD_LINE_LIMIT) {
      overHardLimit.push({ path: relativePath, lines: lineCount });
    }
    if (JS_TS_EXTENSIONS.has(extension)) {
      scanJsTs(relativePath, content, ternaryHits, consoleHits);
    }
  }
  sortByLines(overSoftLimit);
  sortByLines(overHardLimit);
  let underSoftPercent = 100;
  if (analyzed > 0) {
    underSoftPercent = (underSoft / analyzed) * 100;
  }
  process.stdout.write("Style audit report\n");
  process.stdout.write(`Analyzed files: ${analyzed}\n`);
  process.stdout.write(
    `Files under ${SOFT_LINE_LIMIT} lines: ${underSoft}/${analyzed} (${underSoftPercent.toFixed(1)}%)\n`,
  );
  if (underSoftPercent < MIN_UNDER_SOFT_PERCENT) {
    process.stdout.write(
      `Target (${MIN_UNDER_SOFT_PERCENT}%) not yet met; enforcing non-regression floor at ${ENFORCED_UNDER_SOFT_PERCENT.toFixed(1)}%.\n`,
    );
  }
  printSection(`Files over ${SOFT_LINE_LIMIT} lines`, overSoftLimit);
  printSection(`Files over ${HARD_LINE_LIMIT} lines`, overHardLimit);
  process.stdout.write(
    `\nProbable ternary expressions: ${ternaryHits.length}\n`,
  );
  for (const hit of ternaryHits) {
    process.stdout.write(`- ${hit}\n`);
  }
  process.stdout.write(`\nDisallowed console methods: ${consoleHits.length}\n`);
  for (const hit of consoleHits) {
    process.stdout.write(`- ${hit}\n`);
  }
  const failures = [];
  if (overHardLimit.length > 0) {
    failures.push(
      `Files over ${HARD_LINE_LIMIT} lines: ${overHardLimit.length}`,
    );
  }
  if (underSoftPercent < ENFORCED_UNDER_SOFT_PERCENT) {
    failures.push(
      `Files under ${SOFT_LINE_LIMIT} lines below ${ENFORCED_UNDER_SOFT_PERCENT.toFixed(1)}% floor: ${underSoftPercent.toFixed(1)}%`,
    );
  }
  if (ternaryHits.length > 0) {
    failures.push(`Probable ternary expressions found: ${ternaryHits.length}`);
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
