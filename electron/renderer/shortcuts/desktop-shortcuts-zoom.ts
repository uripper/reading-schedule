import type { ZoomApi } from "../../types/types.ts";
import { logError } from "../logger.ts";
import {
    isCommandPressed,
    isZoomInShortcut,
    isZoomOutShortcut,
    isZoomResetShortcut,
} from "./desktop_shortcuts_keys.ts";

const ZOOM_PERCENT_FACTOR = 100;

/**
 * Formats the current zoom factor for user-facing announcements.
 * @param zoomFactor - Browser zoom factor (for example `1` for 100%).
 * @returns Human-readable zoom text.
 */
function formatZoomAnnouncement(zoomFactor: number): string {
    return `Zoom ${Math.round(zoomFactor * ZOOM_PERCENT_FACTOR)}%`;
}

function reportZoomFailure(
    announce: (message: string, politeness?: "polite" | "assertive") => void,
    error: unknown,
): void {
    logError("Zoom operation failed", error);
    announce("Unable to update zoom level", "assertive");
}

function runDetached(operation: Promise<void>): void {
    operation.catch((error: unknown) => {
        logError("Shortcut command failed", error);
    });
}

async function runZoomCommand(
    announce: (message: string, politeness?: "polite" | "assertive") => void,
    operation: () => Promise<number>,
): Promise<void> {
    try {
        const ZOOM_FACTOR = await operation();
        announce(formatZoomAnnouncement(ZOOM_FACTOR));
    } catch (error) {
        reportZoomFailure(announce, error);
    }
}

function handleZoomShortcut(
    event: KeyboardEvent,
    announce: (message: string, politeness?: "polite" | "assertive") => void,
    operation: () => Promise<number>,
): boolean {
    event.preventDefault();
    runDetached(runZoomCommand(announce, operation));
    return true;
}

function zoomOperationForEvent(
    event: KeyboardEvent,
    plannerApi: ZoomApi,
): (() => Promise<number>) | null {
    if (isZoomInShortcut(event)) {
        return async (): Promise<number> => await plannerApi.zoomIn();
    }

    if (isZoomOutShortcut(event)) {
        return async (): Promise<number> => await plannerApi.zoomOut();
    }

    if (isZoomResetShortcut(event)) {
        return async (): Promise<number> => await plannerApi.zoomReset();
    }

    return null;
}

/**
 * Creates a keyboard handler that routes zoom shortcuts through planner IPC.
 * @param plannerApi - Planner bridge API exposing zoom operations.
 * @param announce - Live-region announcer for zoom feedback.
 * @returns Keyboard handler that reports whether it handled the shortcut.
 */
export function createZoomShortcutHandler(
    plannerApi: ZoomApi,
    announce: (message: string, politeness?: "polite" | "assertive") => void,
): (event: KeyboardEvent) => boolean {
    return (event: KeyboardEvent): boolean => {
        if (!isCommandPressed(event)) {
            return false;
        }
        const OPERATION = zoomOperationForEvent(event, plannerApi);

        if (OPERATION === null) {
            return false;
        }

        return handleZoomShortcut(event, announce, OPERATION);
    };
}
