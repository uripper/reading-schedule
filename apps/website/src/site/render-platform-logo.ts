/**
 * Renders platform logos for download cards.
 */

import type { DownloadCard } from "../types/site-content.ts";
import { escapeHtml } from "./render-helpers.ts";

const MAC_OS_PLATFORM: DownloadCard["platform"] = "macOS";

function getPlatformLogoSource(platform: DownloadCard["platform"]): string {
    if (platform === "Linux") {
        return "/LinuxLogo.png";
    }

    if (platform === MAC_OS_PLATFORM) {
        return "/macOS.png";
    }

    return "/WindowsLogo.png";
}

function platformLogoClass(platform: DownloadCard["platform"]): string {
    if (platform === "Windows") {
        return "platform-logo platform-logo--windows";
    }

    if (platform === "macOS") {
        return "platform-logo platform-logo--macos";
    }

    return "platform-logo platform-logo--linux";
}

/**
 * Returns the logo image markup for one platform.
 */
export function renderPlatformLogo(platform: DownloadCard["platform"]): string {
    const PLATFORM_SOURCE = getPlatformLogoSource(platform);
    const PLATFORM_CLASS = platformLogoClass(platform);

    return [
        `<img class="${PLATFORM_CLASS}"`,
        ` src="${escapeHtml(PLATFORM_SOURCE)}"`,
        ' alt=""',
        ' loading="lazy"',
        ' decoding="async"',
        " />",
    ].join("");
}
