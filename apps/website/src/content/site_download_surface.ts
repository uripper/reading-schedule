/**
 * Download-surface content for the public site.
 */

import type { DownloadCard } from "../types/site_content.ts";
import { DOWNLOAD_SECTION_URL } from "./site_urls.ts";

export const DOWNLOAD_CARDS: readonly DownloadCard[] = [
    {
        action: {
            ariaLabel: "Download Bartleby for Windows",
            href: DOWNLOAD_SECTION_URL,
            label: "Download",
            variant: "primary",
        },
        platform: "Windows",
    },
    {
        action: {
            ariaLabel: "Bartleby for macOS is coming soon",
            href: DOWNLOAD_SECTION_URL,
            label: "Coming soon",
            variant: "ghost",
        },
        platform: "macOS",
    },
    {
        action: {
            ariaLabel: "Bartleby for Linux is coming soon",
            href: DOWNLOAD_SECTION_URL,
            label: "Coming soon",
            variant: "ghost",
        },
        platform: "Linux",
    },
];
