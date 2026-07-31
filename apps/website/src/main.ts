/**
 * Mounts the Bartleby website into the page shell.
 */

import { SITE_CONTENT } from "./content/site-content.ts";
import { initializeCodex } from "./site/init-codex.ts";
import { renderRoadmapPage } from "./site/render-roadmap.ts";
import { renderSite } from "./site/render-site.ts";
import { resolveSitePage } from "./site/resolve-site-page.ts";
import type { SitePage } from "./types/site-content.ts";

const HTML_MIME_TYPE = "text/html";
const ROOT_ELEMENT_ID = "app";

function getRootElement(): HTMLElement {
    const DOCUMENT_ROOT = globalThis.document.getElementById(ROOT_ELEMENT_ID);

    if (DOCUMENT_ROOT === null) {
        throw new Error(`Missing website root element: #${ROOT_ELEMENT_ID}`);
    }

    return DOCUMENT_ROOT;
}

function getSitePage(): SitePage {
    return resolveSitePage(globalThis.document.body.dataset.page);
}

/**
 * Create a DocumentFragment from an HTML markup string by parsing it with DOMParser and appending the parsed child nodes.
 * @example
 * createRenderedFragment('<div>Hello</div>')
 * // DocumentFragment containing a <div> element with text "Hello"
 * @param {string} markup - The HTML markup string to parse into a document fragment.
 * @returns {DocumentFragment} A DocumentFragment containing the parsed nodes from the provided markup.
 */
function createRenderedFragment(markup: string): DocumentFragment {
    const DOCUMENT_PARSER = new DOMParser();
    const PARSED_DOCUMENT = DOCUMENT_PARSER.parseFromString(
        markup,
        HTML_MIME_TYPE,
    );
    const PAGE_CONTENT = globalThis.document.createDocumentFragment();
    const PARSED_NODES = Array.from(PARSED_DOCUMENT.body.childNodes);

    PAGE_CONTENT.append(...PARSED_NODES);

    return PAGE_CONTENT;
}

function mountRequestedPage(rootElement: HTMLElement, markup: string): void {
    const PAGE_CONTENT = createRenderedFragment(markup);

    rootElement.replaceChildren(PAGE_CONTENT);
}

function renderRequestedPage(page: SitePage, currentYear: number): string {
    if (page === "landing") {
        return renderSite(SITE_CONTENT, currentYear);
    }

    return renderRoadmapPage(SITE_CONTENT);
}

function scrollToInitialFragment(): void {
    const FRAGMENT = globalThis.location.hash.slice(1);

    if (FRAGMENT.length === 0) {
        return;
    }

    const FRAGMENT_TARGET = globalThis.document.getElementById(FRAGMENT);

    if (FRAGMENT_TARGET === null) {
        return;
    }

    FRAGMENT_TARGET.scrollIntoView();
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_PAGE = getSitePage();
const ROOT_ELEMENT = getRootElement();
const CURRENT_PAGE_MARKUP = renderRequestedPage(CURRENT_PAGE, CURRENT_YEAR);

mountRequestedPage(ROOT_ELEMENT, CURRENT_PAGE_MARKUP);
initializeCodex();
globalThis.requestAnimationFrame(scrollToInitialFragment);
