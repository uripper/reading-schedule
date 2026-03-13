/**
 * Assembles the full website content model from smaller focused modules.
 */

import type { SiteContent } from "../types/site_content.js";
import { DOWNLOAD_CARDS } from "./site_download_surface.js";
import {
    FEATURE_ITEMS,
    HERO_CONTENT,
    WORKFLOW_STEPS,
} from "./site_marketing.js";
import { NAV_ITEMS } from "./site_navigation.js";
import { ROADMAP_CONTENT } from "./site_roadmap.js";

export const SITE_CONTENT: SiteContent = {
    downloads: DOWNLOAD_CARDS,
    features: FEATURE_ITEMS,
    hero: HERO_CONTENT,
    navItems: NAV_ITEMS,
    roadmap: ROADMAP_CONTENT,
    workflow: WORKFLOW_STEPS,
};
