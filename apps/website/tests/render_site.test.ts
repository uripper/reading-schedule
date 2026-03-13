/**
 * Regression checks for the static website renderer.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { SITE_CONTENT } from "../src/content/site_content.js";
import { renderRoadmapPage } from "../src/site/render_roadmap.js";
import { renderSite } from "../src/site/render_site.js";
import { readWebsiteFile } from "./site_render_support.js";

const TEST_YEAR = 2030;
const MAX_SOURCE_LINE_LENGTH = 80;
const RENDER_SOURCE_FILES = [
    "src/site/render_helpers.ts",
    "src/site/render_hero.ts",
    "src/site/render_page_shell.ts",
    "src/site/render_platform_logo.ts",
    "src/site/render_roadmap.ts",
    "src/site/render_sections.ts",
    "src/site/render_site.ts",
];

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLongLines(relativePath: string): readonly string[] {
    const LINES = readWebsiteFile(relativePath).split("\n");

    return LINES.flatMap((line, index) => {
        if (line.length <= MAX_SOURCE_LINE_LENGTH) {
            return [];
        }

        return [`${relativePath}:${index + 1} (${line.length})`];
    });
}

test("renderSite includes the primary page sections", () => {
    const RENDERED_SITE = renderSite(SITE_CONTENT, TEST_YEAR);
    const FEATURE_CARD_MATCHES = RENDERED_SITE.match(
        /class="feature-card step-card offset-card"/g,
    );

    assert.ok(RENDERED_SITE.includes(SITE_CONTENT.hero.headlineLead));
    assert.ok(RENDERED_SITE.includes(SITE_CONTENT.hero.headlineAccent));
    assert.match(RENDERED_SITE, /id="features"/);
    assert.match(RENDERED_SITE, /id="workflow"/);
    assert.match(RENDERED_SITE, /<div class="feature-grid">/);
    assert.equal(FEATURE_CARD_MATCHES?.length, SITE_CONTENT.features.length);
    assert.match(RENDERED_SITE, /id="download"/);
    assert.match(RENDERED_SITE, /href="\.\/roadmap\.html">Roadmap</);
    assert.doesNotMatch(RENDERED_SITE, />0[1-4]</);
});

test("renderRoadmapPage includes the configured roadmap content", () => {
    const RENDERED_ROADMAP = renderRoadmapPage(SITE_CONTENT);

    assert.match(
        RENDERED_ROADMAP,
        /<h1 class="roadmap__title">Bartleby Roadmap</,
    );
    assert.match(
        RENDERED_ROADMAP,
        /<p class="roadmap-phase__status">Here Now</,
    );

    for (const STAGE of SITE_CONTENT.roadmap.stages) {
        assert.match(
            RENDERED_ROADMAP,
            new RegExp(`>${escapeRegExp(STAGE.title)}<`),
        );

        if (STAGE.items === undefined) {
            continue;
        }

        for (const ITEM of STAGE.items) {
            assert.match(
                RENDERED_ROADMAP,
                new RegExp(`>${escapeRegExp(ITEM)}<`),
            );
        }
    }
});

test("renderSite exposes the configured release destinations", () => {
    const RENDERED_SITE = renderSite(SITE_CONTENT, TEST_YEAR);

    assert.doesNotMatch(RENDERED_SITE, /github/i);
    assert.match(
        RENDERED_SITE,
        /class="hero-portrait__image" src="\.\/j\.png"/,
    );
    assert.match(
        RENDERED_SITE,
        /class="platform-logo platform-logo--windows" src="\.\/WindowsLogo\.png"/,
    );
    assert.match(
        RENDERED_SITE,
        /class="platform-logo platform-logo--macos" src="\.\/macOS\.png"/,
    );
    assert.match(
        RENDERED_SITE,
        /class="platform-logo platform-logo--linux" src="\.\/LinuxLogo\.png"/,
    );
    assert.match(RENDERED_SITE, /aria-label="Download Bartleby for Windows"/);
    assert.match(
        RENDERED_SITE,
        /aria-label="Bartleby for macOS is coming soon"/,
    );
    assert.match(
        RENDERED_SITE,
        /aria-label="Bartleby for Linux is coming soon"/,
    );
    assert.match(RENDERED_SITE, />Windows</);
    assert.match(RENDERED_SITE, />macOS</);
    assert.match(RENDERED_SITE, />Linux</);
    assert.match(RENDERED_SITE, />Coming soon</);
    assert.match(RENDERED_SITE, /2030 Bartleby/);
});

test("website render source files stay within 80 columns", () => {
    const LONG_LINES = RENDER_SOURCE_FILES.flatMap((relativePath) => {
        return getLongLines(relativePath);
    });

    assert.deepEqual(LONG_LINES, []);
});

test("website html entries declare the expected page ids", () => {
    const INDEX_HTML = readWebsiteFile("index.html");
    const ROADMAP_HTML = readWebsiteFile("roadmap.html");

    assert.match(INDEX_HTML, /<body data-page="landing">/);
    assert.match(ROADMAP_HTML, /<body data-page="roadmap">/);
});
