/**
 * Renders the top-of-page hero and preview layout.
 */

import type { HeroContent } from "../types/site-content.ts";
import { escapeHtml, joinMarkup, renderButtonLink } from "./render-helpers.ts";

function renderActionRow(hero: HeroContent): string {
    return joinMarkup([
        '<div class="action-row">',
        renderButtonLink(hero.primaryAction),
        "</div>",
    ]);
}

/**
 * Render HTML markup for a hero content block.
 * @example
 * renderHeroCopy({ headlineLead: 'Leading', headlineAccent: 'Accent', body: 'Body text' })
 * '<div class="hero__copy"><h1 class="hero__title">Leading <span>Accent</span></h1><p class="hero__body">Body text</p><!-- action row markup here --></div>'
 * @param hero - Hero content object with headlineLead, headlineAccent, body, and action data.
 * @returns Rendered HTML string for the hero copy block.
 **/
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
        '<div class="hero-portrait__orbit"></div>',
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
        '<div class="hero__registration" aria-hidden="true"></div>',
        renderHeroCopy(hero),
        renderHeroVisual(),
        "</section>",
    ]);
}
