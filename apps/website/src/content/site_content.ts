/**
 * Assembles the full website content model from smaller focused modules.
 */

import type { SiteContent } from "../types/site_content.ts";
import { DOWNLOAD_CARDS } from "./site_download_surface.ts";
import {
    FEATURE_ITEMS,
    HERO_CONTENT,
    WORKFLOW_STEPS,
} from "./site_marketing.ts";
import { NAV_ITEMS } from "./site_navigation.ts";
import { ROADMAP_CONTENT } from "./site_roadmap.ts";

export const SITE_CONTENT: SiteContent = {
    downloads: DOWNLOAD_CARDS,
    features: FEATURE_ITEMS,
    hero: HERO_CONTENT,
    navItems: NAV_ITEMS,
    roadmap: ROADMAP_CONTENT,
    workflow: WORKFLOW_STEPS,
};
