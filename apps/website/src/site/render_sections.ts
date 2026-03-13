/**
 * Renders the remaining website sections after the hero.
 */

import type {
    DownloadCard,
    FeatureItem,
    WorkflowStep,
} from "../types/site_content.js";
import { escapeHtml, joinMarkup, renderButtonLink } from "./render_helpers.js";
import { renderPlatformLogo } from "./render_platform_logo.js";

/**
* Render a section wrapper with the provided CSS class and inner content.
* @example
* renderSectionShell("hero", "<h1>Title</h1>")
* '<section class="section-shell hero"><h1>Title</h1></section>'
* @param {{string}} {{className}} - The CSS class to append to "section-shell".
* @param {{string}} {{content}} - The HTML content to place inside the section.
* @param {{string}} {{id}} - Optional id for the section; if provided it will be HTML-escaped and added as an id attribute.
* @returns {{string}} The HTML string for the section element.
**/
function renderSectionShell(
    className: string,
    content: string,
    id?: string,
): string {
    let idAttribute = "";

    if (id !== undefined) {
        idAttribute = ` id="${escapeHtml(id)}"`;
    }

    return joinMarkup([
        `<section class="section-shell ${className}"${idAttribute}>`,
        content,
        "</section>",
    ]);
}

function renderSectionHeader(title: string): string {
    return joinMarkup([
        '<div class="section-copy__header">',
        `<h2>${escapeHtml(title)}</h2>`,
        "</div>",
    ]);
}

function renderFeatureCard(feature: FeatureItem): string {
    return joinMarkup([
        '<article class="feature-card step-card offset-card">',
        `<h2>${escapeHtml(feature.title)}</h2>`,
        `<p>${escapeHtml(feature.description)}</p>`,
        "</article>",
    ]);
}

/**
* Render a features section composed of feature cards as an HTML string.
* @example
* renderFeatures([{ id: 'f1', title: 'Sample Feature', description: 'Desc' }])
* '<section class="section-copy" id="features">...</section>'
* @param {{readonly FeatureItem[]}} {{features}} - Array of feature items to render into cards.
* @returns {{string}} HTML string for the complete features section.
**/
function renderFeatures(features: readonly FeatureItem[]): string {
    const MARKUP = features.map((feature) => {
        return renderFeatureCard(feature);
    });
    const CONTENT = joinMarkup([
        renderSectionHeader("Make real reading progress."),
        '<div class="feature-grid">',
        joinMarkup(MARKUP),
        "</div>",
    ]);

    return renderSectionShell("section-copy", CONTENT, "features");
}

function renderWorkflowStepCard(step: WorkflowStep): string {
    return joinMarkup([
        '<article class="step-card offset-card">',
        `<h2>${escapeHtml(step.title)}</h2>`,
        `<p>${escapeHtml(step.description)}</p>`,
        "</article>",
    ]);
}

/**
* Render a workflow section as HTML markup from an array of WorkflowStep objects.
* @example
* renderWorkflow([{ title: "Analyze", description: "Adjust settings", /* ... */
function renderWorkflow(workflow: readonly WorkflowStep[]): string {
    const MARKUP = workflow.map((step) => {
        return renderWorkflowStepCard(step);
    });
    const CONTENT = joinMarkup([
        renderSectionHeader("Optimize based on your preferences."),
        '<div class="workflow-grid">',
        joinMarkup(MARKUP),
        "</div>",
    ]);

    return renderSectionShell("workflow-shell", CONTENT, "workflow");
}

function renderDownloadCard(card: DownloadCard): string {
    return joinMarkup([
        '<article class="download-card panel">',
        '<div class="download-card__logo" aria-hidden="true">',
        renderPlatformLogo(card.platform),
        "</div>",
        `<p class="download-card__label">${escapeHtml(card.platform)}</p>`,
        renderButtonLink(card.action),
        "</article>",
    ]);
}

/**
* Renders the "Get Bartleby." downloads section as an HTML string.
* @example
* renderDownloadSection([{ id: "mac", title: "macOS", links: [{ platform: "mac", url: "https://example.com" }] }])
* '<section id="download" class="download-shell">...<div class="download-grid">...'
* @param {{readonly DownloadCard[]}} {{downloads}} - Array of DownloadCard objects used to build each download card.
* @returns {{string}} HTML markup for the complete download section.
**/
function renderDownloadSection(downloads: readonly DownloadCard[]): string {
    const DOWNLOAD_MARKUP = downloads.map((card) => {
        return renderDownloadCard(card);
    });
    const CONTENT = joinMarkup([
        renderSectionHeader("Get Bartleby."),
        '<div class="download-grid">',
        joinMarkup(DOWNLOAD_MARKUP),
        "</div>",
    ]);

    return renderSectionShell("download-shell", CONTENT, "download");
}

/**
* Render the site's footer HTML markup with the provided year.
* @example
* renderFooter(2026)
* '<footer class="section-shell site-footer panel"><div><h2>Read more books.</h2></div><div class="site-footer__meta"><p>&copy; 2026 Bartleby</p></div></footer>'
* @param {{number}} {{currentYear}} - Current year to display in the footer.
* @returns {{string}} Footer HTML markup as a string.
**/
function renderFooter(currentYear: number) {
    const FOOTER_META = joinMarkup([
        '<div class="site-footer__meta">',
        `<p>&copy; ${currentYear} Bartleby</p>`,
        "</div>",
    ]);

    return joinMarkup([
        '<footer class="section-shell site-footer panel">',
        "<div>",
        "<h2>Read more books.</h2>",
        "</div>",
        FOOTER_META,
        "</footer>",
    ]);
}

/**
 * Builds the non-hero site sections.
 */
export function renderSections(
    features: readonly FeatureItem[],
    workflow: readonly WorkflowStep[],
    downloads: readonly DownloadCard[],
    currentYear: number,
): string {
    return joinMarkup([
        renderFeatures(features),
        renderWorkflow(workflow),
        renderDownloadSection(downloads),
        renderFooter(currentYear),
    ]);
}
