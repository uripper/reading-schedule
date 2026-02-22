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

    if (hashIndex >= 0 && (blockStart.index < 0 || hashIndex < blockStart.index)) {
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

function shouldSkipFile(relativePath) {
  if (relativePath === AUDIT_SELF_PATH) {
    return true;
  }
  return false;
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
    documentationHits.push(`${relativePath}:1 module missing top-level docstring`);
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
  const ternaryHits = [];
  const consoleHits = [];
  const documentationHits = [];

  let analyzed = 0;
  let underSoft = 0;

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
    if (lineCount > HARD_LINE_LIMIT) {
      overHardLimit.push({ path: relativePath, lines: lineCount });
    }

    if (JS_TS_EXTENSIONS.has(extension)) {
      scanJsTs(relativePath, content, ternaryHits, consoleHits);
      scanJsTsDocumentation(relativePath, content, documentationHits);
      continue;
    }

    if (extension === ".py") {
      scanPythonDocumentation(relativePath, content, documentationHits);
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

  printSection(`Files over ${SOFT_LINE_LIMIT} lines`, overSoftLimit);
  printSection(`Files over ${HARD_LINE_LIMIT} lines`, overHardLimit);
  printHitSection("Probable ternary expressions", ternaryHits);
  printHitSection("Disallowed console methods", consoleHits);
  printHitSection("Probable documentation gaps", documentationHits);

  const failures = [];
  if (overHardLimit.length > 0) {
    failures.push(`Files over ${HARD_LINE_LIMIT} lines: ${overHardLimit.length}`);
  }
  if (underSoftPercent < MIN_UNDER_SOFT_PERCENT) {
    failures.push(
      `Files under ${SOFT_LINE_LIMIT} lines below ${MIN_UNDER_SOFT_PERCENT}%: ${underSoftPercent.toFixed(1)}%`,
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
