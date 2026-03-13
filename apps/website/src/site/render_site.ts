/**
 * Composes the full Bartleby landing page markup.
 */

import type { SiteContent } from "../types/site_content.js";
import { joinMarkup } from "./render_helpers.js";
import { renderHero } from "./render_hero.js";
import { renderPageShell } from "./render_page_shell.js";
import { renderSections } from "./render_sections.js";

/**
 * Returns the full HTML for the static website shell.
 */
export function renderSite(content: SiteContent, currentYear: number): string {
    const MAIN_CONTENT = joinMarkup([
        renderHero(content.hero),
        renderSections(
            content.features,
            content.workflow,
            content.downloads,
            currentYear,
        ),
    ]);

    return renderPageShell(
        {
            brandHref: "#top",
            navItems: content.navItems,
            primaryAction: content.hero.primaryAction,
        },
        MAIN_CONTENT,
    );
}
