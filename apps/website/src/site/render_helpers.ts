/**
 * Shared HTML render helpers for the website's static sections.
 */

import type { ActionLink, NavItem } from "../types/site_content.js";

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
    "'": "&#39;",
    '"': "&quot;",
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
};

/**
 * Escapes text content for string-based markup rendering.
 */
export function escapeHtml(value: string): string {
    return value.replace(/[&"'<>]/g, (character) => {
        const ESCAPED_CHARACTER = HTML_ESCAPE_MAP[character];

        if (ESCAPED_CHARACTER === undefined) {
            return character;
        }

        return ESCAPED_CHARACTER;
    });
}

/**
 * Builds the anchor markup used across the site.
 */
export function renderActionLink(
    link: ActionLink | NavItem,
    className: string,
): string {
    let ariaLabelAttribute = "";

    if ("ariaLabel" in link && link.ariaLabel !== undefined) {
        ariaLabelAttribute = ` aria-label="${escapeHtml(link.ariaLabel)}"`;
    }

    return joinMarkup([
        `<a class="${className}" href="${escapeHtml(link.href)}"`,
        ariaLabelAttribute,
        `>${escapeHtml(link.label)}</a>`,
    ]);
}

/**
 * Builds the shared primary button markup used across the site.
 */
export function renderButtonLink(link: ActionLink): string {
    const CLASS_NAME = `button-link button-link--${link.variant}`;

    return renderActionLink(link, CLASS_NAME);
}

/**
 * Joins pre-rendered markup fragments without repeating `.join("")`.
 */
export function joinMarkup(markup: readonly string[]): string {
    return markup.join("");
}
