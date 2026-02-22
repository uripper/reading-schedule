import type { PlannerApi } from "../app/types.js";
import { el } from "../dom.js";
import { createFindController } from "./desktop_shortcuts_find.js";
import { createZoomShortcutHandler } from "./desktop_shortcuts_zoom.js";

type ShortcutBindings = {
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  plannerApi: Pick<
    PlannerApi,
    "findInPage" | "stopFindInPage" | "zoomIn" | "zoomOut" | "zoomReset"
  >;
};

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
    if (
      findController.handleFindShortcut(event) ||
      handleZoomShortcut(event) ||
      findController.handleFindBarEscape(event)
    ) {
      return;
    }
  });
}
