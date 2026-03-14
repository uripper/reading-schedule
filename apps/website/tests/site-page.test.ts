import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SITE_CONTENT } from "../src/content/site-content.ts";
import { DOWNLOAD_CARDS } from "../src/content/site-download-surface.ts";
import { WINDOWS_DOWNLOAD_URL } from "../src/content/site-urls.ts";
import { renderPlatformLogo } from "../src/site/render-platform-logo.ts";
import { renderRoadmapPage } from "../src/site/render-roadmap.ts";
import { resolveSitePage } from "../src/site/resolve-site-page.ts";

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
    assert.equal(DOWNLOAD_CARDS[0]?.action.href, WINDOWS_DOWNLOAD_URL);
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
