import type { PlannerApi, WindowFindResponse } from "./app/types.js";
import { el } from "./dom.js";
import { logError } from "./logger.js";
import {
  isCommandPressed,
  isZoomInShortcut,
  isZoomOutShortcut,
  isZoomResetShortcut,
} from "./desktop_shortcuts_keys.js";
const ZOOM_PERCENT_FACTOR = 100;
const FIND_STATUS_HINT = "Type to search";
const FIND_STATUS_NO_MATCH = "No matches";
type ShortcutBindings = {
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  plannerApi: Pick<PlannerApi, "findInPage" | "stopFindInPage" | "zoomIn" | "zoomOut" | "zoomReset">;
};
function setFindStatus(target: HTMLOutputElement, message: string): void {
  target.value = message;
  target.textContent = message;
}
function formatZoomAnnouncement(zoomFactor: number): string {
  return `Zoom ${Math.round(zoomFactor * ZOOM_PERCENT_FACTOR)}%`;
}
function formatFindStatus(result: WindowFindResponse): string {
  if (result.matches <= 0) {
    return FIND_STATUS_NO_MATCH;
  }
  return `${result.activeMatchOrdinal} of ${result.matches}`;
}
export function bindDesktopShortcuts({ announce, plannerApi }: ShortcutBindings): void {
  const findBar = el<HTMLElement>("findBar");
  const findInput = el<HTMLInputElement>("findInput");
  const findStatus = el<HTMLOutputElement>("findStatus");
  const findPrevButton = el<HTMLButtonElement>("findPrevBtn");
  const findNextButton = el<HTMLButtonElement>("findNextBtn");
  const findCloseButton = el<HTMLButtonElement>("findCloseBtn");
  let lastQuery = "";
  let opener: HTMLElement | null = null;
  let requestCounter = 0;
  const runZoomCommand = async (operation: () => Promise<number>) => {
    try {
      const zoomFactor = await operation();
      announce(formatZoomAnnouncement(zoomFactor));
    } catch (error) {
      logError("Zoom operation failed", error);
      announce("Unable to update zoom level", "assertive");
    }
  };
  const runFindCommand = async (direction: "next" | "prev", forceNextForSameQuery: boolean) => {
    const query = findInput.value.trim();
    if (!query) {
      lastQuery = "";
      setFindStatus(findStatus, FIND_STATUS_HINT);
      const clearRequestCounter = requestCounter + 1;
      requestCounter = clearRequestCounter;
      try {
        await plannerApi.stopFindInPage();
      } catch (error) {
        logError("Failed to clear find highlights", error);
        announce("Unable to clear search results", "assertive");
      }
      return;
    }
    let findNext = false;
    if (query === lastQuery && forceNextForSameQuery) {
      findNext = true;
    }
    const currentRequest = requestCounter + 1;
    requestCounter = currentRequest;
    try {
      const result = await plannerApi.findInPage({
        query,
        findNext,
        forward: direction === "next",
      });
      if (currentRequest !== requestCounter) {
        return;
      }
      setFindStatus(findStatus, formatFindStatus(result));
      lastQuery = query;
    } catch (error) {
      logError("Find operation failed", error);
      announce("Unable to search the page", "assertive");
      setFindStatus(findStatus, "Search failed");
    }
  };
  const runDetached = (operation: Promise<void>) => {
    operation.catch((error) => {
      logError("Shortcut command failed", error);
    });
  };
  const openFindBar = () => {
    if (findBar.hidden && document.activeElement instanceof HTMLElement) {
      opener = document.activeElement;
    }
    findBar.hidden = false;
    setFindStatus(findStatus, FIND_STATUS_HINT);
    findInput.focus();
    findInput.select();
  };
  const closeFindBar = () => {
    if (findBar.hidden) {
      return;
    }
    findBar.hidden = true;
    findInput.value = "";
    lastQuery = "";
    setFindStatus(findStatus, "");
    const clearRequestCounter = requestCounter + 1;
    requestCounter = clearRequestCounter;
    plannerApi.stopFindInPage().catch((error) => {
      logError("Failed to clear find highlights", error);
      announce("Unable to clear search results", "assertive");
    });
    if (opener?.isConnected) {
      opener.focus();
    }
    opener = null;
  };
  findInput.addEventListener("input", () => {
    runDetached(runFindCommand("next", false));
  });
  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        runDetached(runFindCommand("prev", true));
        return;
      }
      runDetached(runFindCommand("next", true));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeFindBar();
    }
  });
  findPrevButton.addEventListener("click", () => {
    runDetached(runFindCommand("prev", true));
    findInput.focus();
  });
  findNextButton.addEventListener("click", () => {
    runDetached(runFindCommand("next", true));
    findInput.focus();
  });
  findCloseButton.addEventListener("click", () => {
    closeFindBar();
  });
  const handleFindShortcut = (event: KeyboardEvent): boolean => {
    if (!isCommandPressed(event) || (event.key !== "f" && event.key !== "F")) {
      return false;
    }
    event.preventDefault();
    openFindBar();
    return true;
  };
  const handleZoomShortcut = (event: KeyboardEvent): boolean => {
    if (!isCommandPressed(event)) {
      return false;
    }
    if (isZoomInShortcut(event)) {
      event.preventDefault();
      runDetached(runZoomCommand(() => plannerApi.zoomIn()));
      return true;
    }
    if (isZoomOutShortcut(event)) {
      event.preventDefault();
      runDetached(runZoomCommand(() => plannerApi.zoomOut()));
      return true;
    }
    if (isZoomResetShortcut(event)) {
      event.preventDefault();
      runDetached(runZoomCommand(() => plannerApi.zoomReset()));
      return true;
    }
    return false;
  };
  const handleFindBarEscape = (event: KeyboardEvent): boolean => {
    if (event.key !== "Escape" || findBar.hidden) {
      return false;
    }
    const { activeElement } = document;
    if (activeElement instanceof HTMLElement && findBar.contains(activeElement)) {
      event.preventDefault();
      closeFindBar();
      return true;
    }
    return false;
  };
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    if (handleFindShortcut(event) || handleZoomShortcut(event) || handleFindBarEscape(event)) {
      return;
    }
  });
}
