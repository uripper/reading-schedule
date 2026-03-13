/**
 * Shared primary navigation content for the public site.
 */

import type { NavItem } from "../types/site-content.ts";
import {
    FEATURES_SECTION_URL,
    ROADMAP_PAGE_URL,
    WORKFLOW_SECTION_URL,
} from "./site-urls.ts";

export const NAV_ITEMS: readonly NavItem[] = [
    { href: FEATURES_SECTION_URL, label: "Why Bartleby" },
    { href: WORKFLOW_SECTION_URL, label: "How it works" },
    { href: ROADMAP_PAGE_URL, label: "Roadmap" },
];
