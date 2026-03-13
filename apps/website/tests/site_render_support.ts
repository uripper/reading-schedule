/**
 * Shared rendered-markup helpers for website tests.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_CONTENT } from "../src/content/site_content.js";
import { renderRoadmapPage } from "../src/site/render_roadmap.js";
import { renderSite } from "../src/site/render_site.js";
import type { SitePage } from "../src/types/site_content.js";

const TEST_YEAR = 2030;
const ANCHOR_PATTERN = /<a\b([^>]*)>(.*?)<\/a>/g;
const CURRENT_FILE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

function getWebsiteRoot(): string {
    const PARENT_DIRECTORY = path.dirname(CURRENT_FILE_DIRECTORY);

    if (path.basename(PARENT_DIRECTORY) === "dist-tests") {
        return path.dirname(PARENT_DIRECTORY);
    }

    return PARENT_DIRECTORY;
}

const WEBSITE_ROOT = getWebsiteRoot();

/**
 * Returns the rendered website markup used by the current tests.
 */
export function renderWebsite(page: SitePage = "landing"): string {
    if (page === "roadmap") {
        return renderRoadmapPage(SITE_CONTENT);
    }

    return renderSite(SITE_CONTENT, TEST_YEAR);
}

/**
 * Reads a source file from the website package.
 */
export function readWebsiteFile(relativePath: string): string {
    const FILE_PATH = path.join(WEBSITE_ROOT, relativePath);

    return fs.readFileSync(FILE_PATH, "utf8");
}

/**
 * Counts regex matches without repeating `matchAll` boilerplate in tests.
 */
export function countMatches(value: string, expression: RegExp): number {
    return [...value.matchAll(expression)].length;
}

/**
 * Extracts rendered anchors from the generated markup.
 */
export function getAnchors(html: string): readonly string[] {
    return Array.from(html.matchAll(ANCHOR_PATTERN), (match) => {
        const ANCHOR_MARKUP = match[0];

        if (ANCHOR_MARKUP === undefined) {
            throw new Error("Missing anchor markup.");
        }

        return ANCHOR_MARKUP;
    });
}

/**
 * Returns the attribute string for a rendered anchor tag.
 */
export function getAnchorAttributes(anchor: string): string {
    const MATCH = anchor.match(/^<a\b([^>]*)>/);

    if (MATCH === null) {
        throw new Error(`Invalid anchor markup: ${anchor}`);
    }

    const ATTRIBUTE_MARKUP = MATCH[1];

    if (ATTRIBUTE_MARKUP === undefined) {
        throw new Error(`Missing anchor attributes: ${anchor}`);
    }

    return ATTRIBUTE_MARKUP;
}

/**
 * Returns the text content for a rendered anchor tag.
 */
export function getAnchorText(anchor: string): string {
    return anchor
        .replace(/^<a\b[^>]*>/, "")
        .replace(/<\/a>$/, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
