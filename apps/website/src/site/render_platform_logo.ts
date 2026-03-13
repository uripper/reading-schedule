/**
 * Renders platform logos for download cards.
 */

import type { DownloadCard } from "../types/site_content.ts";
import { escapeHtml } from "./render_helpers.ts";

type PlatformLogoMap = Readonly<Record<DownloadCard["platform"], string>>;

const PLATFORM_LOGO_FILES: PlatformLogoMap = {
    Linux: "/LinuxLogo.png",
    macOS: "/macOS.png",
    Windows: "/WindowsLogo.png",
};

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
    const PLATFORM_SOURCE = PLATFORM_LOGO_FILES[platform];
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
