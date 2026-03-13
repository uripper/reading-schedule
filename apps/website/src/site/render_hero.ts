/**
 * Renders the top-of-page hero and preview layout.
 */

import type { HeroContent } from "../types/site_content.js";
import { escapeHtml, joinMarkup, renderButtonLink } from "./render_helpers.js";

function renderActionRow(hero: HeroContent): string {
    return joinMarkup([
        '<div class="action-row">',
        renderButtonLink(hero.primaryAction),
        "</div>",
    ]);
}

function renderHeroCopy(hero: HeroContent): string {
    return joinMarkup([
        '<div class="hero__copy">',
        '<h1 class="hero__title">',
        escapeHtml(hero.headlineLead),
        " ",
        `<span>${escapeHtml(hero.headlineAccent)}</span>`,
        "</h1>",
        `<p class="hero__body">${escapeHtml(hero.body)}</p>`,
        renderActionRow(hero),
        "</div>",
    ]);
}

function renderHeroVisual(): string {
    return joinMarkup([
        '<div aria-hidden="true" class="hero__visual">',
        '<div class="hero-portrait">',
        '<img class="hero-portrait__image" src="./j.png" alt="" />',
        "</div>",
        "</div>",
    ]);
}

/**
 * Builds the website hero section.
 */
export function renderHero(hero: HeroContent): string {
    return joinMarkup([
        '<section class="section-shell hero panel" id="top">',
        renderHeroCopy(hero),
        renderHeroVisual(),
        "</section>",
    ]);
}
