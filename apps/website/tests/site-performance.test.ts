/**
 * Verifies the performance copy, benchmark measurements, and accessible chart.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SITE_CONTENT } from "../src/content/site-content.ts";
import {
    PERFORMANCE_DESCRIPTION,
    PERFORMANCE_HEADING,
} from "../src/content/site-performance.ts";
import { escapeHtml } from "../src/site/render-helpers.ts";
import { renderPerformancePage } from "../src/site/render-performance.ts";
import { renderRoadmapPage } from "../src/site/render-roadmap.ts";
import { renderSite } from "../src/site/render-site.ts";
import { resolveSitePage } from "../src/site/resolve-site-page.ts";

const TESTS_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIRECTORY = path.resolve(TESTS_DIRECTORY, "..", "..");
const REPOSITORY_DIRECTORY = path.resolve(WEBSITE_DIRECTORY, "..", "..");
const BENCHMARK_FILENAME = "bartleby_schedule_benchmark.svg";
const TEST_YEAR = 2026;
const BENCHMARK_MEASUREMENTS = [
    [100, 1],
    [200, 4],
    [400, 16],
    [800, 70],
    [1600, 295],
    [2400, 817],
    [2600, 996],
    [2700, 1134],
    [2800, 1263],
    [3200, 1747],
];

test("performance section preserves the README heading and entire paragraph", () => {
    const README = fs.readFileSync(
        path.join(REPOSITORY_DIRECTORY, "README.md"),
        "utf8",
    );
    const PERFORMANCE_SECTION = README.split("## Bartleby is fast\n")[1]
        ?.split("\n## ")[0]
        ?.trim();

    assert.ok(PERFORMANCE_SECTION);
    assert.ok(PERFORMANCE_SECTION.endsWith(PERFORMANCE_DESCRIPTION));
    const MARKUP = renderPerformancePage(SITE_CONTENT);
    assert.ok(
        MARKUP.includes(
            `<h1 id="performance-heading">${PERFORMANCE_HEADING}</h1>`,
        ),
    );
    assert.ok(MARKUP.includes(`<p>${escapeHtml(PERFORMANCE_DESCRIPTION)}</p>`));
    assert.doesNotMatch(
        MARKUP,
        /Built to keep up with you|performance__eyebrow/,
    );
});

test("performance chart preserves the original benchmark measurements", () => {
    const WEBSITE_CHART = fs.readFileSync(
        path.join(WEBSITE_DIRECTORY, "public", BENCHMARK_FILENAME),
        "utf8",
    );

    for (const [BOOKS, DURATION_MS] of BENCHMARK_MEASUREMENTS) {
        assert.ok(
            WEBSITE_CHART.includes(
                `data-books="${BOOKS}" data-duration-ms="${DURATION_MS}"`,
            ),
        );
    }
    assert.match(WEBSITE_CHART, /viewBox="0 0 1120 680"/);
    assert.match(
        WEBSITE_CHART,
        /aria-labelledby="chart-title chart-description"/,
    );
    assert.match(WEBSITE_CHART, /1,600 books · 295 ms/);
    assert.match(WEBSITE_CHART, /2,600 books · 996 ms/);
    assert.match(WEBSITE_CHART, /1-second threshold/);
});

test("performance chart supports keyboard scrolling and a full-size view", () => {
    const MARKUP = renderPerformancePage(SITE_CONTENT);

    assert.match(MARKUP, /href="\.\/bartleby_schedule_benchmark\.svg"/);
    assert.match(
        MARKUP,
        /class="performance__chart-viewport" role="region" tabindex="0"/,
    );
    assert.match(
        MARKUP,
        /src="\.\/bartleby_schedule_benchmark\.svg" alt="Bartleby benchmark:/,
    );
});

test("performance has its own page and shared navigation tab", () => {
    assert.equal(resolveSitePage("performance"), "performance");
    const PAGES = [
        renderSite(SITE_CONTENT, TEST_YEAR),
        renderRoadmapPage(SITE_CONTENT),
        renderPerformancePage(SITE_CONTENT),
    ];

    for (const PAGE of PAGES) {
        assert.match(
            PAGE,
            /href="\.\/performance\.html">Bartleby is Fast<\/a>/,
        );
    }

    assert.match(
        PAGES.at(-1) ?? "",
        /aria-current="page" class="nav-link" href="\.\/performance\.html"/,
    );
    assert.doesNotMatch(PAGES[0] ?? "", /id="performance-heading"/);
    assert.doesNotMatch(PAGES[0] ?? "", /bartleby_schedule_benchmark\.svg/);
});

test("performance entrypoint selects the page and loads its motion styles", () => {
    const ENTRYPOINT = fs.readFileSync(
        path.join(WEBSITE_DIRECTORY, "performance.html"),
        "utf8",
    );
    const STYLES = fs.readFileSync(
        path.join(WEBSITE_DIRECTORY, "src", "styles", "performance.css"),
        "utf8",
    );

    assert.match(ENTRYPOINT, /data-page="performance"/);
    assert.match(ENTRYPOINT, /href="\.\/src\/styles\/performance\.css"/);
    assert.match(
        STYLES,
        /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*animation: performance-fade-in/,
    );
    assert.match(STYLES, /animation: performance-fade-up/);
});
