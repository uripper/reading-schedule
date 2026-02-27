import type { PlannerApi } from "../../types/types.js";
import { el } from "../dom.js";
import { createFindController } from "./desktop_shortcuts_find.js";
import { createZoomShortcutHandler } from "./desktop_shortcuts_zoom.js";

interface ShortcutBindings {
  announce(this: void, message: string, politeness?: "polite" | "assertive"): void;
  plannerApi: Pick<
    PlannerApi,
    "findInPage" | "stopFindInPage" | "zoomIn" | "zoomOut" | "zoomReset"
  >;
}

/**
 * Wires global desktop shortcut handlers for find-in-page and zoom commands.
 * @param root0 Shortcut dependencies.
 * @param root0.announce Live-region announcer for shortcut feedback messages.
 * @param root0.plannerApi Bridge API for find and zoom actions.
 */
export function bindDesktopShortcuts({
  announce,
  plannerApi,
}: ShortcutBindings): void {
  const findController = createFindController({
    announce,
    plannerApi,
    findBar: el("findBar"),
    findInput: el<HTMLInputElement>("findInput"),
    findStatus: el<HTMLOutputElement>("findStatus"),
    findPrevButton: el<HTMLButtonElement>("findPrevBtn"),
    findNextButton: el<HTMLButtonElement>("findNextBtn"),
    findCloseButton: el<HTMLButtonElement>("findCloseBtn"),
  });
  findController.bind();
  const handleZoomShortcut = createZoomShortcutHandler(plannerApi, announce);
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    if (findController.handleFindShortcut(event)) {
      return;
    }
    if (handleZoomShortcut(event)) {
      return;
    }
    findController.handleFindBarEscape(event);
  });
}
