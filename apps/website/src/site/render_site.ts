/**
 * Composes the full Bartleby landing page markup.
 */

import type { SiteContent } from "../types/site_content.ts";
import { joinMarkup } from "./render_helpers.ts";
import { renderHero } from "./render_hero.ts";
import { renderPageShell } from "./render_page_shell.ts";
import { renderSections } from "./render_sections.ts";

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
