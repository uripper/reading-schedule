import assert from "node:assert/strict";
import test from "node:test";

import { renderPlatformLogo } from "../src/site/render_platform_logo.ts";
import { resolveSitePage } from "../src/site/resolve_site_page.ts";

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
