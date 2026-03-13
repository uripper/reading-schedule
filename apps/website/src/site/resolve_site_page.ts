/**
 * Resolves the configured site page id to a supported page.
 */

import type { SitePage } from "../types/site_content.js";

const DEFAULT_SITE_PAGE: SitePage = "landing";
const ROADMAP_PAGE: SitePage = "roadmap";

/**
* Resolve a page identifier into a valid SitePage, defaulting to DEFAULT_SITE_PAGE when undefined.
* @example
* resolveSitePage(undefined)
* DEFAULT_SITE_PAGE
* @param {{string|undefined}} {{pageId}} - Page identifier to resolve; may be undefined or a known page id.
* @returns {{SitePage}} Return the resolved SitePage constant (DEFAULT_SITE_PAGE, ROADMAP_PAGE, or the provided pageId).
**/
export function resolveSitePage(pageId: string | undefined): SitePage {
    if (pageId === undefined) {
        return DEFAULT_SITE_PAGE;
    }

    if (pageId === DEFAULT_SITE_PAGE) {
        return pageId;
    }

    if (pageId === ROADMAP_PAGE) {
        return pageId;
    }

    throw new Error(
        `Invalid website page id in body[data-page]: ${JSON.stringify(pageId)}`,
    );
}
