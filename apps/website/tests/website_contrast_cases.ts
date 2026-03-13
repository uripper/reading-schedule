/**
 * Contrast cases for the website's text and surface combinations.
 */

import {
    MIN_LARGE_TEXT_CONTRAST,
    MIN_NORMAL_TEXT_CONTRAST,
} from "./site_style_support.js";

const BODY_BACKGROUND = "#090909";

export interface ContrastCase {
    backgroundLayers?: readonly string[];
    backgrounds?: readonly string[];
    foreground: string;
    minimumContrast: number;
    name: string;
}

export const WEBSITE_CONTRAST_CASES: readonly ContrastCase[] = [
    {
        backgrounds: ["var(--color-paper)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Hero body copy on the light hero panel",
    },
    {
        backgrounds: [BODY_BACKGROUND],
        foreground: "var(--color-paper)",
        minimumContrast: MIN_LARGE_TEXT_CONTRAST,
        name: "Section headings on the dark page background",
    },
    {
        backgrounds: ["var(--color-panel)"],
        foreground: "var(--color-white)",
        minimumContrast: MIN_LARGE_TEXT_CONTRAST,
        name: "Feature card titles on panel backgrounds",
    },
    {
        backgrounds: ["var(--color-panel)"],
        foreground: "rgb(247 240 223 / 0.84)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Feature card body copy on panel backgrounds",
    },
    {
        backgrounds: ["var(--color-panel)"],
        foreground: "var(--color-paper)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Step card labels on panel backgrounds",
    },
    {
        backgrounds: ["var(--color-panel)"],
        foreground: "var(--color-paper)",
        minimumContrast: MIN_LARGE_TEXT_CONTRAST,
        name: "Workflow step titles on panel backgrounds",
    },
    {
        backgrounds: ["var(--color-panel)"],
        foreground: "rgb(247 240 223 / 0.84)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Workflow step body copy on panel backgrounds",
    },
    {
        backgrounds: ["var(--color-acid)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Primary action text on acid buttons",
    },
    {
        backgrounds: ["var(--color-paper)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Ghost action text on paper cards",
    },
    {
        backgrounds: ["var(--color-white)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Nav text on white pills",
    },
    {
        backgrounds: ["var(--color-paper)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_LARGE_TEXT_CONTRAST,
        name: "Download card logos on paper cards",
    },
    {
        backgrounds: ["var(--color-paper)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_NORMAL_TEXT_CONTRAST,
        name: "Footer copy on paper panels",
    },
    {
        backgrounds: ["var(--color-acid)"],
        foreground: "var(--color-ink)",
        minimumContrast: MIN_LARGE_TEXT_CONTRAST,
        name: "Accent display text on the hero highlight",
    },
];
