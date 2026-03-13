/**
 * Assembles the full website content model from smaller focused modules.
 */

import type { SiteContent } from "../types/site-content.ts";
import { DOWNLOAD_CARDS } from "./site-download-surface.ts";
import {
    FEATURE_ITEMS,
    HERO_CONTENT,
    WORKFLOW_STEPS,
} from "./site-marketing.ts";
import { NAV_ITEMS } from "./site-navigation.ts";
import { ROADMAP_CONTENT } from "./site-roadmap.ts";

export const SITE_CONTENT: SiteContent = {
    downloads: DOWNLOAD_CARDS,
    features: FEATURE_ITEMS,
    hero: HERO_CONTENT,
    navItems: NAV_ITEMS,
    roadmap: ROADMAP_CONTENT,
    workflow: WORKFLOW_STEPS,
};
