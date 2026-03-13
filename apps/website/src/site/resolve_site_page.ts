/**
 * Resolves the configured site page id to a supported page.
 */

import type { SitePage } from "../types/site_content.js";

const DEFAULT_SITE_PAGE: SitePage = "landing";
const ROADMAP_PAGE: SitePage = "roadmap";

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
