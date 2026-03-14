/**
 * Renders the Bartleby roadmap page.
 */

import { HOME_PAGE_URL } from "../content/site-urls.ts";
import type { RoadmapStage, SiteContent } from "../types/site-content.ts";
import { escapeHtml, joinMarkup } from "./render-helpers.ts";
import { renderPageShell } from "./render-page-shell.ts";

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

function renderRoadmapStatus(
    highlightLabel: RoadmapStage["highlightLabel"],
): string {
    if (highlightLabel === undefined) {
        return "";
    }

    return joinMarkup([
        '<p class="roadmap-phase__status">',
        escapeHtml(highlightLabel),
        "</p>",
    ]);
}

function roadmapStageClassName(stage: RoadmapStage, index: number): string {
    let className = "roadmap-stage panel";

    if (index % 2 === 0) {
        className += " roadmap-stage--left";
    } else {
        className += " roadmap-stage--right";
    }

    if (stage.items === undefined) {
        className += " roadmap-stage--title-only";
    }

    return className;
}

function renderRoadmapStage(stage: RoadmapStage, index: number): string {
    return joinMarkup([
        `<article class="${roadmapStageClassName(stage, index)}" data-roadmap-stage>`,
        '<div class="roadmap-stage__accent" aria-hidden="true"></div>',
        '<div class="roadmap-stage__surface">',
        '<div class="roadmap-stage__header">',
        `<h2 class="roadmap-stage__title">${escapeHtml(stage.title)}</h2>`,
        renderRoadmapStatus(stage.highlightLabel),
        "</div>",
        renderRoadmapItems(stage.items),
        "</div>",
        "</article>",
    ]);
}

function renderRoadmap(content: SiteContent): string {
    const STAGE_MARKUP = content.roadmap.stages.map((stage, index) => {
        return renderRoadmapStage(stage, index);
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

export function renderRoadmapPage(content: SiteContent): string {
    return renderPageShell(
        {
            brandHref: HOME_PAGE_URL,
            navItems: content.navItems,
        },
        renderRoadmap(content),
    );
}
