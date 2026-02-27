
import { logError } from "../logger.js";
import { isCommandPressed, isZoomInShortcut, isZoomOutShortcut, isZoomResetShortcut } from "./desktop_shortcuts_keys.js";
import type { ZoomApi } from "../../types/app_runtime.js";

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
  const runZoomCommand = async (
    operation: () => Promise<number>,
  ): Promise<void> => {
    try {
      const zoomFactor = await operation();
      announce(formatZoomAnnouncement(zoomFactor));
    } catch (error) {
      logError("Zoom operation failed", error);
      announce("Unable to update zoom level", "assertive");
    }
  };
  const runDetached = (operation: Promise<void>): void => {
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
      runDetached(runZoomCommand(async () => await plannerApi.zoomIn()));
      return true;
    }
    if (isZoomOutShortcut(event)) {
      event.preventDefault();
      runDetached(runZoomCommand(async () => await plannerApi.zoomOut()));
      return true;
    }
    if (isZoomResetShortcut(event)) {
      event.preventDefault();
      runDetached(runZoomCommand(async () => await plannerApi.zoomReset()));
      return true;
    }
    return false;
  };
}
