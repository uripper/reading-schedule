/**
 * Renders the Bartleby roadmap page.
 */

import { HOME_PAGE_URL } from "../content/site_urls.js";
import type { RoadmapStage, SiteContent } from "../types/site_content.js";
import { escapeHtml, joinMarkup } from "./render_helpers.js";
import { renderPageShell } from "./render_page_shell.js";

/**
 * Render an HTML unordered list of roadmap items or return an empty string when none are provided.
 * @example
 * renderRoadmapItems(['Plan', 'Build'])
 * '<ul class="roadmap-phase__list"><li>Plan</li><li>Build</li></ul>'
 * @param {readonly string[]|undefined} items - Read-only array of item strings or undefined to render nothing.
 * @returns {string} HTML string containing a UL with LI elements for each item, or an empty string.
 **/
function renderRoadmapItems(items: readonly string[] | undefined): string {
    if (items === undefined) {
        return "";
    }

    const ITEM_MARKUP = items.map((item) => {
        return `<li>${escapeHtml(item)}</li>`;
    });

    return joinMarkup([
        '<ul class="roadmap-phase__list">',
        joinMarkup(ITEM_MARKUP),
        "</ul>",
    ]);
}

/**
 * Render a roadmap phase object into an HTML string.
 * @example
 * renderRoadmapPhase({ title: 'Phase 1', highlightLabel: 'Beta', items: [] })
 * '<article class="roadmap-phase offset-card">...</article>'
 * @param {RoadmapStage} stage - Roadmap phase data including title, optional highlightLabel, and items.
 * @returns {string} HTML string representing the rendered roadmap phase.
 **/
function renderRoadmapPhase(stage: RoadmapStage): string {
    let statusMarkup = "";

    if (stage.highlightLabel !== undefined) {
        statusMarkup = joinMarkup([
            '<p class="roadmap-phase__status">',
            escapeHtml(stage.highlightLabel),
            "</p>",
        ]);
    }

    return joinMarkup([
        '<article class="roadmap-phase offset-card">',
        '<div class="roadmap-phase__header">',
        `<h2>${escapeHtml(stage.title)}</h2>`,
        statusMarkup,
        "</div>",
        renderRoadmapItems(stage.items),
        "</article>",
    ]);
}

/**
 * Render the roadmap section HTML from the provided site content.
 * @example
 * renderRoadmap(sampleContent)
 * '<section class="section-shell roadmap panel" id="top">...</section>'
 * @param {{SiteContent}} {{content}} - The site content object containing a roadmap with heading and stages.
 * @returns {{string}} Rendered HTML string for the roadmap section.
 **/
function renderRoadmap(content: SiteContent): string {
    const STAGE_MARKUP = content.roadmap.stages.map((stage) => {
        return renderRoadmapPhase(stage);
    });

    return joinMarkup([
        '<section class="section-shell roadmap panel" id="top">',
        '<h1 class="roadmap__title">',
        escapeHtml(content.roadmap.heading),
        "</h1>",
        '<div class="roadmap__phases">',
        joinMarkup(STAGE_MARKUP),
        "</div>",
        "</section>",
    ]);
}

/**
 * Builds the roadmap page using the shared site chrome.
 */
export function renderRoadmapPage(content: SiteContent): string {
    return renderPageShell(
        {
            brandHref: HOME_PAGE_URL,
            navItems: content.navItems,
        },
        renderRoadmap(content),
    );
}
