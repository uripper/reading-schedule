/**
 * Accessibility and readability checks for the public website.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
    countMatches,
    getAnchorAttributes,
    getAnchors,
    getAnchorText,
    readWebsiteFile,
    renderWebsite,
} from "./site_render_support.js";
import {
    contrastRatio,
    contrastRatioForLayers,
    readStyleTokens,
} from "./site_style_support.js";
import {
    type ContrastCase,
    WEBSITE_CONTRAST_CASES,
} from "./website_contrast_cases.js";

const MIN_EXPECTED_ANCHORS = 8;

function getContrastCaseResult(
    contrastCase: ContrastCase,
    tokens: Readonly<Record<string, string>>,
): string | null {
    const RATIOS: number[] = [];

    if (contrastCase.backgrounds !== undefined) {
        for (const BACKGROUND of contrastCase.backgrounds) {
            RATIOS.push(
                contrastRatio(contrastCase.foreground, BACKGROUND, tokens),
            );
        }
    }

    if (contrastCase.backgroundLayers !== undefined) {
        RATIOS.push(
            contrastRatioForLayers(
                contrastCase.foreground,
                contrastCase.backgroundLayers,
                tokens,
            ),
        );
    }

    const LOWEST_RATIO = Math.min(...RATIOS);

    if (LOWEST_RATIO >= contrastCase.minimumContrast) {
        return null;
    }

    return `${contrastCase.name}: ${LOWEST_RATIO.toFixed(2)}:1`;
}

test("renderSite exposes keyboard-friendly landmark structure", () => {
    const LANDING_SITE = renderWebsite();
    const ROADMAP_SITE = renderWebsite("roadmap");

    assert.match(
        LANDING_SITE,
        /class="skip-link" href="#main-content">Skip to content</,
    );
    assert.match(LANDING_SITE, /<main id="main-content" tabindex="-1">/);
    assert.match(LANDING_SITE, /<nav class="site-nav" aria-label="Primary">/);
    assert.match(LANDING_SITE, /aria-hidden="true" class="hero__visual"/);
    assert.equal(countMatches(LANDING_SITE, /<h1\b/g), 1);
    assert.match(ROADMAP_SITE, /<main id="main-content" tabindex="-1">/);
    assert.match(ROADMAP_SITE, /<nav class="site-nav" aria-label="Primary">/);
    assert.equal(countMatches(ROADMAP_SITE, /<h1\b/g), 1);
});

test("renderSite keeps link text discernible and targets valid", () => {
    const PAGES = [renderWebsite(), renderWebsite("roadmap")];

    for (const PAGE of PAGES) {
        const ANCHORS = getAnchors(PAGE);

        assert.ok(ANCHORS.length >= MIN_EXPECTED_ANCHORS / 2);

        for (const ANCHOR of ANCHORS) {
            const ATTRIBUTES = getAnchorAttributes(ANCHOR);
            const LINK_TEXT = getAnchorText(ANCHOR);
            const HREF_MATCH = ATTRIBUTES.match(/href="([^"]+)"/);

            assert.notEqual(LINK_TEXT.length, 0);

            if (HREF_MATCH === null) {
                assert.fail(`Anchor is missing href: ${ANCHOR}`);
            }

            const HREF_VALUE = HREF_MATCH[1];

            if (HREF_VALUE === undefined) {
                assert.fail(`Anchor href could not be read: ${ANCHOR}`);
            }

            if (HREF_VALUE.startsWith("#")) {
                const TARGET_ID = HREF_VALUE.slice(1);

                assert.notEqual(TARGET_ID, "");
                assert.match(PAGE, new RegExp(`id="${TARGET_ID}"`));
            }

            if (ATTRIBUTES.includes('target="_blank"')) {
                assert.match(ATTRIBUTES, /rel="noopener noreferrer"/);
            }
        }
    }
});

test("website text contrast stays readable across actual surfaces", () => {
    const STYLE_TOKENS = readStyleTokens();
    const FAILURES = WEBSITE_CONTRAST_CASES.flatMap((contrastCase) => {
        const FAILURE = getContrastCaseResult(contrastCase, STYLE_TOKENS);

        if (FAILURE === null) {
            return [];
        }

        return [FAILURE];
    });

    if (FAILURES.length > 0) {
        assert.fail(FAILURES.join("\n"));
    }
});

test("website styles preserve focus visibility, readable sizing, and motion safety", () => {
    const BASE_STYLES = readWebsiteFile("src/styles/base.css");
    const COMPONENT_STYLES = readWebsiteFile("src/styles/components.css");
    const LAYOUT_STYLES = readWebsiteFile("src/styles/layout.css");
    const MOTION_STYLES = readWebsiteFile("src/styles/motion.css");

    assert.match(BASE_STYLES, /\.skip-link/);
    assert.match(BASE_STYLES, /\.skip-link:focus-visible/);
    assert.match(BASE_STYLES, /a:focus-visible\s*\{/);
    assert.match(BASE_STYLES, /outline:\s*3px solid var\(--color-acid\)/);
    assert.match(
        BASE_STYLES,
        /\.offset-card\s*\{[^}]*color:\s*var\(--color-white\);[^}]*background:\s*var\(--color-panel\);/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.hero__body,\s*\.site-footer p:last-child\s*\{[^}]*font-size:\s*1\.25rem;[^}]*color:\s*var\(--color-ink\);/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.step-card p:last-child\s*\{[^}]*color:\s*rgb\(247 240 223 \/ 0\.84\);/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.download-card__logo\s*\{[^}]*min-height:\s*12rem;/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.download-card__label\s*\{[^}]*font-weight:\s*700;[^}]*color:\s*var\(--color-ink\);/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.hero__title span\s*\{[^}]*background:\s*linear-gradient\(/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.hero-portrait__image\s*\{[^}]*width:\s*min\(100%, 24rem\);/s,
    );
    assert.doesNotMatch(COMPONENT_STYLES, /\.feature-card__eyebrow/);
    assert.doesNotMatch(COMPONENT_STYLES, /\.step-card__kicker/);
    assert.match(
        COMPONENT_STYLES,
        /\.platform-logo--windows\s*\{[^}]*max-height:\s*7rem;/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.platform-logo--macos\s*\{[^}]*max-height:\s*5\.5rem;/s,
    );
    assert.match(
        COMPONENT_STYLES,
        /\.platform-logo--linux\s*\{[^}]*max-height:\s*12rem;/s,
    );
    assert.match(
        LAYOUT_STYLES,
        /\.download-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s,
    );
    assert.doesNotMatch(COMPONENT_STYLES, /\.availability-card/);
    assert.doesNotMatch(COMPONENT_STYLES, /\.stat-card/);
    assert.doesNotMatch(COMPONENT_STYLES, /\.button-link--secondary/);
    assert.doesNotMatch(LAYOUT_STYLES, /\.meta-pill-list/);
    assert.doesNotMatch(LAYOUT_STYLES, /\.scheduler-board/);
    assert.doesNotMatch(MOTION_STYLES, /\.availability-card/);
    assert.match(MOTION_STYLES, /prefers-reduced-motion:\s*no-preference/);
});
