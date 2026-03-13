/**
 * Composes the full Bartleby landing page markup.
 */

import type { SiteContent } from "../types/site-content.ts";
import { joinMarkup } from "./render-helpers.ts";
import { renderHero } from "./render-hero.ts";
import { renderPageShell } from "./render-page-shell.ts";
import { renderSections } from "./render-sections.ts";

/**
 * Returns the full HTML for the static website shell.
 */
export function renderSite(content: SiteContent, currentYear: number): string {
    const MAIN_CONTENT = joinMarkup([
        renderHero(content.hero),
        renderSections({
            currentYear,
            downloads: content.downloads,
            features: content.features,
            workflow: content.workflow,
        }),
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
