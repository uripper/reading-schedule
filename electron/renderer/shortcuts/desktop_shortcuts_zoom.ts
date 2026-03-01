import { logError } from "@renderer/logger.js";
import { type ZoomApi } from "../../types/types.js";
import {
    isCommandPressed,
    isZoomInShortcut,
    isZoomOutShortcut,
    isZoomResetShortcut,
} from "./desktop_shortcuts_keys.js";

const ZOOM_PERCENT_FACTOR = 100;

/**
 * Formats the current zoom factor for user-facing announcements.
 * @param zoomFactor Browser zoom factor (for example `1` for 100%).
 * @returns Human-readable zoom text.
 */
function formatZoomAnnouncement(zoomFactor: number): string {
    return `Zoom ${Math.round(zoomFactor * ZOOM_PERCENT_FACTOR)}%`;
}

/**
 * Creates a keyboard handler that routes zoom shortcuts through planner IPC.
 * @param plannerApi Planner bridge API exposing zoom operations.
 * @param announce Live-region announcer for zoom feedback.
 * @returns Keyboard handler that reports whether it handled the shortcut.
 */
export function createZoomShortcutHandler(
    plannerApi: ZoomApi,
    announce: (message: string, politeness?: "polite" | "assertive") => void,
): (event: KeyboardEvent) => boolean {
    const RUN_ZOOM_COMMAND = async (
        operation: () => Promise<number>,
    ): Promise<void> => {
        try {
            const ZOOM_FACTOR = await operation();
            announce(formatZoomAnnouncement(ZOOM_FACTOR));
        } catch (error) {
            logError("Zoom operation failed", error);
            announce("Unable to update zoom level", "assertive");
        }
    };
    const RUN_DETACHED = (operation: Promise<void>): void => {
        operation.catch((error: unknown) => {
            logError("Shortcut command failed", error);
        });
    };
    return (event: KeyboardEvent): boolean => {
        if (!isCommandPressed(event)) {
            return false;
        }
        if (isZoomInShortcut(event)) {
            event.preventDefault();
            RUN_DETACHED(
                RUN_ZOOM_COMMAND(async () => await plannerApi.zoomIn()),
            );
            return true;
        }
        if (isZoomOutShortcut(event)) {
            event.preventDefault();
            RUN_DETACHED(
                RUN_ZOOM_COMMAND(async () => await plannerApi.zoomOut()),
            );
            return true;
        }
        if (isZoomResetShortcut(event)) {
            event.preventDefault();
            RUN_DETACHED(
                RUN_ZOOM_COMMAND(async () => await plannerApi.zoomReset()),
            );
            return true;
        }
        return false;
    };
}
