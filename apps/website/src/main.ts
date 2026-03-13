/**
 * Mounts the Bartleby website into the page shell.
 */

import { SITE_CONTENT } from "./content/site_content.js";
import { renderRoadmapPage } from "./site/render_roadmap.js";
import { renderSite } from "./site/render_site.js";
import type { SitePage } from "./types/site_content.js";

const ROOT_ELEMENT_ID = "app";

function getRootElement(): HTMLElement {
    const DOCUMENT_ROOT = globalThis.document.getElementById(ROOT_ELEMENT_ID);

    if (DOCUMENT_ROOT === null) {
        throw new Error(`Missing website root element: #${ROOT_ELEMENT_ID}`);
    }

    return DOCUMENT_ROOT;
}

function getSitePage(): SitePage {
    const PAGE_ID = globalThis.document.body.dataset.page;

    if (PAGE_ID === "landing") {
        return PAGE_ID;
    }

    if (PAGE_ID === "roadmap") {
        return PAGE_ID;
    }

    throw new Error("Missing or invalid website page id.");
}

function renderRequestedPage(page: SitePage, currentYear: number): string {
    if (page === "landing") {
        return renderSite(SITE_CONTENT, currentYear);
    }

    return renderRoadmapPage(SITE_CONTENT);
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_PAGE = getSitePage();
const ROOT_ELEMENT = getRootElement();

ROOT_ELEMENT.innerHTML = renderRequestedPage(CURRENT_PAGE, CURRENT_YEAR);
