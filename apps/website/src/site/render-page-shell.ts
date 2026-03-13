/**
 * Shared page frame markup for the Bartleby website.
 */

import type { ActionLink, NavItem } from "../types/site-content.ts";
import {
    escapeHtml,
    joinMarkup,
    renderActionLink,
    renderButtonLink,
} from "./render-helpers.ts";

/**
 * Content passed into the shared website frame.
 */
export interface PageShellContent {
    readonly brandHref: string;
    readonly navItems: readonly NavItem[];
    readonly primaryAction?: ActionLink;
}

function renderBrandLink(brandHref: string): string {
    return `<a class="brand-mark" href="${escapeHtml(brandHref)}">Bartleby</a>`;
}

function renderPrimaryNav(navItems: readonly NavItem[]): string {
    const NAV_LINKS = navItems.map((navItem) => {
        return renderActionLink(navItem, "nav-link");
    });

    return joinMarkup([
        '<nav class="site-nav" aria-label="Primary">',
        joinMarkup(NAV_LINKS),
        "</nav>",
    ]);
}

/**
 * Render the header section of the page shell as an HTML string.
 * @example
 * renderHeader({ primaryAction: { label: 'Sign up', href: '/signup' }, brandHref: '/', navItems: [] })
 * '<header class="section-shell site-header panel"><a class="brand" href="/">Brand</a><nav>...</nav><a class="button" href="/signup">Sign up</a></header>'
 * @param content - Page shell content including brandHref, navItems, and optional primaryAction.
 * @returns HTML string for the header element.
 **/
function renderHeader(content: PageShellContent): string {
    let actionMarkup = "";

    if (content.primaryAction !== undefined) {
        actionMarkup = renderButtonLink(content.primaryAction);
    }

    return joinMarkup([
        '<header class="section-shell site-header panel">',
        renderBrandLink(content.brandHref),
        renderPrimaryNav(content.navItems),
        actionMarkup,
        "</header>",
    ]);
}

/**
 * Wraps page-specific content with the shared site shell.
 */
export function renderPageShell(
    content: PageShellContent,
    mainContent: string,
): string {
    return joinMarkup([
        '<div class="page-shell">',
        '<a class="skip-link" href="#main-content">Skip to content</a>',
        renderHeader(content),
        '<main id="main-content" tabindex="-1">',
        mainContent,
        "</main>",
        "</div>",
    ]);
}
