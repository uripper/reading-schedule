/**
 * Renders the dedicated planner performance page and benchmark chart.
 */

import {
    PERFORMANCE_DESCRIPTION,
    PERFORMANCE_HEADING,
} from "../content/site-performance.ts";
import { HOME_PAGE_URL, PERFORMANCE_PAGE_URL } from "../content/site-urls.ts";
import type { SiteContent } from "../types/site-content.ts";
import { escapeHtml, joinMarkup } from "./render-helpers.ts";
import { renderPageShell } from "./render-page-shell.ts";

/**
 * Pairs the performance explanation with a full-width, scalable benchmark chart.
 */
function renderPerformanceSection(): string {
    return joinMarkup([
        '<section class="section-shell performance" id="top" aria-labelledby="performance-heading">',
        '<div class="performance__copy">',
        `<h1 id="performance-heading">${escapeHtml(PERFORMANCE_HEADING)}</h1>`,
        `<p>${escapeHtml(PERFORMANCE_DESCRIPTION)}</p>`,
        "</div>",
        '<figure class="performance__figure">',
        '<div class="performance__chart-viewport" role="region" tabindex="0" aria-label="Schedule generation benchmark; scroll horizontally on smaller screens">',
        '<a class="performance__chart" href="./bartleby_schedule_benchmark.svg" aria-label="View the full-size Bartleby benchmark chart">',
        '<img src="./bartleby_schedule_benchmark.svg" alt="Bartleby benchmark: time to generate 10 years of daily reading schedules by number of books; 1,600 books in 295 ms and 2,600 books in 996 ms" width="1151" height="721" />',
        "</a>",
        "</div>",
        '<figcaption class="performance__chart-hint">Scroll horizontally to read the chart.</figcaption>',
        "</figure>",
        "</section>",
    ]);
}

/**
 * Gives performance its own navigation destination and page heading.
 */
export function renderPerformancePage(content: SiteContent): string {
    return renderPageShell(
        {
            brandHref: HOME_PAGE_URL,
            currentPageHref: PERFORMANCE_PAGE_URL,
            navItems: content.navItems,
        },
        renderPerformanceSection(),
    );
}
