/**
 * Renders the landing page as one scroll-driven codex.
 */

import type {
    DownloadCard,
    FeatureItem,
    WorkflowStep,
} from "../types/site-content.ts";
import { escapeHtml, joinMarkup, renderButtonLink } from "./render-helpers.ts";
import { renderPlatformLogo } from "./render-platform-logo.ts";

type RenderSectionsContent = Readonly<{
    currentYear: number;
    downloads: readonly DownloadCard[];
    features: readonly FeatureItem[];
    workflow: readonly WorkflowStep[];
}>;

const DISPLAY_INDEX_OFFSET = 1;
const INDEX_PADDING = 2;

function displayIndex(index: number): string {
    return String(index + DISPLAY_INDEX_OFFSET).padStart(INDEX_PADDING, "0");
}

function renderFeatureScene(feature: FeatureItem, index: number): string {
    const SCENE_CLASS = [
        "codex-scene",
        "codex-scene--feature",
        `codex-scene--feature-${displayIndex(index)}`,
    ].join(" ");

    return joinMarkup([
        `<article class="${SCENE_CLASS}" data-codex-scene>`,
        '<div class="codex-scene__geometry" aria-hidden="true"></div>',
        `<p class="codex-scene__number" aria-hidden="true">${displayIndex(index)}</p>`,
        '<div class="codex-scene__copy">',
        `<h2>${escapeHtml(feature.title)}</h2>`,
        `<p>${escapeHtml(feature.description)}</p>`,
        "</div>",
        "</article>",
    ]);
}

function renderManifestoScene(): string {
    return joinMarkup([
        '<article class="codex-scene codex-scene--manifesto" data-codex-scene>',
        '<div class="codex-manifesto__mark" aria-hidden="true"></div>',
        "<h2>Make real reading progress.</h2>",
        '<div class="codex-manifesto__rule" aria-hidden="true"></div>',
        "</article>",
    ]);
}

function renderWorkflowStep(step: WorkflowStep, index: number): string {
    return joinMarkup([
        '<article class="codex-workflow__step">',
        `<p class="codex-workflow__number" aria-hidden="true">${displayIndex(index)}</p>`,
        `<h3>${escapeHtml(step.title)}</h3>`,
        `<p>${escapeHtml(step.description)}</p>`,
        "</article>",
    ]);
}

function renderWorkflowScene(workflow: readonly WorkflowStep[]): string {
    const STEP_MARKUP = workflow.map((step, index) => {
        return renderWorkflowStep(step, index);
    });

    return joinMarkup([
        '<article class="codex-scene codex-scene--workflow" data-codex-scene>',
        '<div class="codex-workflow__heading">',
        "<h2>Optimize based on your preferences.</h2>",
        "</div>",
        '<div class="codex-workflow__grid">',
        joinMarkup(STEP_MARKUP),
        "</div>",
        "</article>",
    ]);
}

function renderDownloadCard(card: DownloadCard): string {
    return joinMarkup([
        '<article class="codex-download">',
        '<div class="codex-download__logo" aria-hidden="true">',
        renderPlatformLogo(card.platform),
        "</div>",
        renderButtonLink(card.action),
        "</article>",
    ]);
}

function renderDownloadScene(downloads: readonly DownloadCard[]): string {
    const DOWNLOAD_MARKUP = downloads.map((card) => {
        return renderDownloadCard(card);
    });

    return joinMarkup([
        '<article class="codex-scene codex-scene--download" data-codex-scene>',
        "<h2>Get Bartleby.</h2>",
        '<div class="codex-downloads">',
        joinMarkup(DOWNLOAD_MARKUP),
        "</div>",
        "</article>",
    ]);
}

function renderCodex(content: RenderSectionsContent): string {
    const FEATURE_MARKUP = content.features.map((feature, index) => {
        return renderFeatureScene(feature, index);
    });
    const SCENES = [
        renderManifestoScene(),
        ...FEATURE_MARKUP,
        renderWorkflowScene(content.workflow),
        renderDownloadScene(content.downloads),
    ];

    return joinMarkup([
        '<section class="codex-scroll" id="features" data-codex-scroll>',
        '<span class="codex-anchor codex-anchor--workflow" id="workflow"></span>',
        '<span class="codex-anchor codex-anchor--download" id="download"></span>',
        '<div class="codex-stage" data-codex-stage>',
        '<div class="codex-stage__pages">',
        '<div class="codex-stage__edge" aria-hidden="true"></div>',
        joinMarkup(SCENES),
        "</div>",
        "</div>",
        "</section>",
    ]);
}

function renderFooter(currentYear: number): string {
    return joinMarkup([
        '<footer class="section-shell site-footer panel">',
        '<div class="site-footer__mark" aria-hidden="true"></div>',
        "<div>",
        "<h2>Read more books.</h2>",
        "</div>",
        '<div class="site-footer__meta">',
        `<p>&copy; ${currentYear} Bartleby</p>`,
        "</div>",
        "</footer>",
    ]);
}

/**
 * Builds the non-hero site sections.
 */
export function renderSections(content: RenderSectionsContent): string {
    return joinMarkup([
        renderCodex(content),
        renderFooter(content.currentYear),
    ]);
}
