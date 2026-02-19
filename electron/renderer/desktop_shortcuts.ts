import type { PlannerApi, WindowFindResponse } from "./app/types.js";
import { el } from "./dom.js";
const ZOOM_PERCENT_FACTOR = 100;
const FIND_STATUS_HINT = "Type to search";
const FIND_STATUS_NO_MATCH = "No matches";
type ShortcutBindings = {
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  plannerApi: Pick<PlannerApi, "findInPage" | "stopFindInPage" | "zoomIn" | "zoomOut" | "zoomReset">;
};
function isCommandPressed(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey;
}
function isZoomInShortcut(event: KeyboardEvent): boolean {
  return event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
}
function isZoomOutShortcut(event: KeyboardEvent): boolean {
  return event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
}
function isZoomResetShortcut(event: KeyboardEvent): boolean {
  return event.key === "0";
}
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
      console.error("Zoom operation failed", error);
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
        console.error("Failed to clear find highlights", error);
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
        forward: direction === "next",
        findNext,
      });
      if (currentRequest !== requestCounter) {
        return;
      }
      setFindStatus(findStatus, formatFindStatus(result));
      lastQuery = query;
    } catch (error) {
      console.error("Find operation failed", error);
      announce("Unable to search the page", "assertive");
      setFindStatus(findStatus, "Search failed");
    }
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
    void plannerApi.stopFindInPage().catch((error) => {
      console.error("Failed to clear find highlights", error);
      announce("Unable to clear search results", "assertive");
    });
    if (opener && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  };
  findInput.addEventListener("input", () => {
    void runFindCommand("next", false);
  });
  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        void runFindCommand("prev", true);
        return;
      }
      void runFindCommand("next", true);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeFindBar();
    }
  });
  findPrevButton.addEventListener("click", () => {
    void runFindCommand("prev", true);
    findInput.focus();
  });
  findNextButton.addEventListener("click", () => {
    void runFindCommand("next", true);
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
      void runZoomCommand(() => plannerApi.zoomIn());
      return true;
    }
    if (isZoomOutShortcut(event)) {
      event.preventDefault();
      void runZoomCommand(() => plannerApi.zoomOut());
      return true;
    }
    if (isZoomResetShortcut(event)) {
      event.preventDefault();
      void runZoomCommand(() => plannerApi.zoomReset());
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
