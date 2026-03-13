/**
 * Renders the Bartleby roadmap page.
 */

import { HOME_PAGE_URL } from "../content/site_urls.js";
import type { RoadmapStage, SiteContent } from "../types/site_content.js";
import { escapeHtml, joinMarkup } from "./render_helpers.js";
import { renderPageShell } from "./render_page_shell.js";

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
