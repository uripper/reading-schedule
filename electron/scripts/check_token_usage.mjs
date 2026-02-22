import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronRoot = path.resolve(__dirname, "..");
const stylesRoot = path.join(electronRoot, "styles");
const ignoreFiles = new Set([path.join(stylesRoot, "generated", "tokens.css")]);
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

function walkCssFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCssFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(fullPath);
    }
  }
  return files;
}

let failures = 0;
for (const filePath of walkCssFiles(stylesRoot)) {
  if (ignoreFiles.has(filePath)) {
    continue;
  }
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("/*")) {
      continue;
    }
    const matches = line.match(hexPattern);
    if (!matches) {
      continue;
    }
    failures += 1;
    process.stderr.write(
      `${path.relative(electronRoot, filePath)}:${index + 1} uses raw hex color ${matches.join(", ")}\n`,
    );
  }
}

if (failures > 0) {
  process.stderr.write(
    `\nFound ${failures} raw hex color usage(s). Use design tokens from tokens/dtcg.tokens.json.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "Token usage check passed: no raw hex colors found in style sources.\n",
);
