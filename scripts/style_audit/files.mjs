/** File discovery helpers for the style audit. */
import fs from "node:fs";
import path from "node:path";

import { CODE_EXTENSIONS, IGNORED_DIRECTORIES, IGNORED_FILES, SOURCE_ROOTS } from "./config.mjs";

const shouldIncludeDirectory = (entryName) => {
	return !IGNORED_DIRECTORIES.has(entryName) && !entryName.startsWith(".");
};

const shouldIncludeFile = (entryName) => {
	return !IGNORED_FILES.has(entryName);
};

export const collectFiles = () => {
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
				if (!shouldIncludeDirectory(entry.name)) {
					continue;
				}
				stack.push(fullPath);
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}
			if (!shouldIncludeFile(entry.name)) {
				continue;
			}
			if (!CODE_EXTENSIONS.has(path.extname(entry.name))) {
				continue;
			}

			files.push(fullPath);
		}
	}

	return files;
};
