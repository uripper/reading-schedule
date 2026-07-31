import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SITE_CONTENT } from "../src/content/site-content.ts";
import { DOWNLOAD_CARDS } from "../src/content/site-download-surface.ts";
import {
    MACOS_APPLE_SILICON_DOWNLOAD_URL,
    MACOS_INTEL_DOWNLOAD_URL,
    WINDOWS_DOWNLOAD_URL,
} from "../src/content/site-urls.ts";
import { escapeHtml } from "../src/site/render-helpers.ts";
import { renderPlatformLogo } from "../src/site/render-platform-logo.ts";
import { renderRoadmapPage } from "../src/site/render-roadmap.ts";
import { renderSite } from "../src/site/render-site.ts";
import { resolveSitePage } from "../src/site/resolve-site-page.ts";

const CODEX_NON_FEATURE_SCENE_COUNT = 3;
const TEST_YEAR = 2026;
const WORKFLOW_CONTROL_COUNT = 3;

test("resolveSitePage defaults to landing when data-page is absent", () => {
    assert.equal(resolveSitePage(undefined), "landing");
});

test("resolveSitePage accepts supported page ids", () => {
    assert.equal(resolveSitePage("landing"), "landing");
    assert.equal(resolveSitePage("roadmap"), "roadmap");
});

test("resolveSitePage reports the invalid page id value", () => {
    assert.throws(() => {
        resolveSitePage("docs");
    }, /"docs"/);
});

test("renderPlatformLogo uses public asset urls", () => {
    assert.match(renderPlatformLogo("Linux"), /src="\/LinuxLogo\.png"/);
    assert.match(renderPlatformLogo("macOS"), /src="\/macOS\.png"/);
    assert.match(renderPlatformLogo("Windows"), /src="\/WindowsLogo\.png"/);
});

test("website ships the copied app icon asset", () => {
    const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
    const ICON_PATH = path.join(TESTS_DIR, "..", "..", "public", "icon.ico");

    assert.equal(fs.existsSync(ICON_PATH), true);
});

test("windows download card uses the GitHub release installer url", () => {
    assert.equal(DOWNLOAD_CARDS[0]?.platform, "Windows");
    assert.equal(DOWNLOAD_CARDS[0]?.actions[0]?.href, WINDOWS_DOWNLOAD_URL);
});

test("macOS download card links both supported architectures", () => {
    const MAC_OS_CARD = DOWNLOAD_CARDS.find((card) => {
        return card.platform === "macOS";
    });

    assert.ok(MAC_OS_CARD);
    assert.equal(
        MAC_OS_CARD.actions[0]?.href,
        MACOS_APPLE_SILICON_DOWNLOAD_URL,
    );
    assert.equal(MAC_OS_CARD.actions[1]?.href, MACOS_INTEL_DOWNLOAD_URL);
});

test("renderRoadmapPage renders alternating roadmap cards with details", () => {
    const ROADMAP_MARKUP = renderRoadmapPage(SITE_CONTENT);
    const STAGE_COUNT =
        ROADMAP_MARKUP.match(/data-roadmap-stage/g)?.length ?? 0;

    assert.match(ROADMAP_MARKUP, /roadmap-stage--left/);
    assert.match(ROADMAP_MARKUP, /roadmap-stage--right/);
    assert.match(ROADMAP_MARKUP, /Add books/);
    assert.equal(STAGE_COUNT, SITE_CONTENT.roadmap.stages.length);
});

test("landing page renders one continuous codex with every feature", () => {
    const LANDING_MARKUP = renderSite(SITE_CONTENT, TEST_YEAR);
    const SCENE_COUNT = LANDING_MARKUP.match(/data-codex-scene/g)?.length ?? 0;
    const EXPECTED_SCENE_COUNT =
        SITE_CONTENT.features.length + CODEX_NON_FEATURE_SCENE_COUNT;

    assert.equal(SCENE_COUNT, EXPECTED_SCENE_COUNT);
    assert.match(LANDING_MARKUP, /class="codex-scroll"/);
    assert.match(LANDING_MARKUP, /id="workflow"/);
    assert.match(LANDING_MARKUP, /id="download"/);
});

test("landing codex preserves feature titles and descriptions", () => {
    const LANDING_MARKUP = renderSite(SITE_CONTENT, TEST_YEAR);

    for (const FEATURE of SITE_CONTENT.features) {
        assert.equal(LANDING_MARKUP.includes(escapeHtml(FEATURE.title)), true);
        assert.equal(
            LANDING_MARKUP.includes(escapeHtml(FEATURE.description)),
            true,
        );
    }
});

test("workflow renders one explicit knob for each visual control", () => {
    const LANDING_MARKUP = renderSite(SITE_CONTENT, TEST_YEAR);
    const KNOB_COUNT =
        LANDING_MARKUP.match(/class="codex-workflow__knob"/g)?.length ?? 0;

    assert.equal(KNOB_COUNT, WORKFLOW_CONTROL_COUNT);
});
