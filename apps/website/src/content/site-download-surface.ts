/**
 * Download-surface content for the public site.
 */

import type { DownloadCard } from "../types/site-content.ts";
import {
    DOWNLOAD_SECTION_URL,
    MACOS_APPLE_SILICON_DOWNLOAD_URL,
    MACOS_INTEL_DOWNLOAD_URL,
    WINDOWS_DOWNLOAD_URL,
} from "./site-urls.ts";

export const DOWNLOAD_CARDS: readonly DownloadCard[] = [
    {
        actions: [
            {
                ariaLabel: "Download Bartleby for Windows",
                href: WINDOWS_DOWNLOAD_URL,
                label: "Download",
                variant: "primary",
            },
        ],
        platform: "Windows",
    },
    {
        actions: [
            {
                ariaLabel: "Download Bartleby for Mac with Apple silicon",
                href: MACOS_APPLE_SILICON_DOWNLOAD_URL,
                label: "Apple silicon",
                variant: "primary",
            },
            {
                ariaLabel: "Download Bartleby for Intel Mac",
                href: MACOS_INTEL_DOWNLOAD_URL,
                label: "Intel",
                variant: "primary",
            },
        ],
        platform: "macOS",
    },
    {
        actions: [
            {
                ariaLabel: "Bartleby for Linux is coming soon",
                href: DOWNLOAD_SECTION_URL,
                label: "Coming soon",
                variant: "ghost",
            },
        ],
        platform: "Linux",
    },
];
