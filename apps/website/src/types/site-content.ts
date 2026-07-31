/**
 * Shared content contracts for the Bartleby website.
 */

export interface ActionLink {
    readonly ariaLabel?: string;
    readonly href: string;
    readonly label: string;
    readonly variant: "ghost" | "primary";
}

export interface NavItem {
    readonly href: string;
    readonly label: string;
}

export interface FeatureItem {
    readonly description: string;
    readonly title: string;
}

export interface WorkflowStep {
    readonly description: string;
    readonly title: string;
}

export interface DownloadCard {
    readonly actions: readonly ActionLink[];
    readonly platform: "Linux" | "Windows" | "macOS";
}

export interface HeroContent {
    readonly body: string;
    readonly headlineAccent: string;
    readonly headlineLead: string;
    readonly primaryAction: ActionLink;
}

export interface RoadmapStage {
    readonly highlightLabel?: "Here Now";
    readonly items?: readonly string[];
    readonly title: string;
}

export interface RoadmapContent {
    readonly heading: string;
    readonly stages: readonly RoadmapStage[];
}

export type SitePage = "landing" | "roadmap";

export interface SiteContent {
    readonly downloads: readonly DownloadCard[];
    readonly features: readonly FeatureItem[];
    readonly hero: HeroContent;
    readonly navItems: readonly NavItem[];
    readonly roadmap: RoadmapContent;
    readonly workflow: readonly WorkflowStep[];
}
