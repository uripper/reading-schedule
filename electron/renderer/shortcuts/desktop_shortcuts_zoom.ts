import type { PlannerApi } from "../app/types.js";
import { logError } from "../logger.js";
import {
  isCommandPressed,
  isZoomInShortcut,
  isZoomOutShortcut,
  isZoomResetShortcut,
} from "./desktop_shortcuts_keys.js";

const ZOOM_PERCENT_FACTOR = 100;

type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;

/**
 *
 * @param zoomFactor
 */
function formatZoomAnnouncement(zoomFactor: number): string {
  return `Zoom ${Math.round(zoomFactor * ZOOM_PERCENT_FACTOR)}%`;
}

/**
 *
 * @param plannerApi
 * @param announce
 */
export function createZoomShortcutHandler(
  plannerApi: ZoomApi,
  announce: (message: string, politeness?: "polite" | "assertive") => void,
): (event: KeyboardEvent) => boolean {
  const runZoomCommand = async (operation: () => Promise<number>) => {
    try {
      const zoomFactor = await operation();
      announce(formatZoomAnnouncement(zoomFactor));
    } catch (error) {
      logError("Zoom operation failed", error);
      announce("Unable to update zoom level", "assertive");
    }
  };
  const runDetached = (operation: Promise<void>) => {
    operation.catch((error) => {
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
