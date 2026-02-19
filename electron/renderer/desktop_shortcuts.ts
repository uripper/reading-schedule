import type { PlannerApi } from "./app/types.js";
import { el } from "./dom.js";

const ZOOM_PERCENT_FACTOR = 100;

type ShortcutBindings = {
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  plannerApi: Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;
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

function setSelectionAnchorAtBoundary(collapseToEnd: boolean): void {
  const selection = globalThis.getSelection();
  if (!selection || !document.body) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(document.body);
  range.collapse(!collapseToEnd);
  selection.removeAllRanges();
  selection.addRange(range);
}

function clearSelection(): void {
  globalThis.getSelection()?.removeAllRanges();
}

function runFindQuery(query: string, backwards = false): boolean {
  const findFn = (globalThis as Window & {
    find?: (
      text: string,
      caseSensitive?: boolean,
      backwards?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean,
    ) => boolean;
  }).find;
  if (!query || typeof findFn !== "function") {
    return false;
  }
  return findFn.call(globalThis, query, false, backwards, true, false, false, false);
}

function formatZoomAnnouncement(zoomFactor: number): string {
  return `Zoom ${Math.round(zoomFactor * ZOOM_PERCENT_FACTOR)}%`;
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

  const executeFind = (backwards: boolean, resetAnchor: boolean) => {
    const query = findInput.value.trim();
    if (!query) {
      setFindStatus(findStatus, "Type to search");
      lastQuery = "";
      return;
    }
    if (resetAnchor || query !== lastQuery) {
      setSelectionAnchorAtBoundary(backwards);
    }
    const found = runFindQuery(query, backwards);
    if (found) {
      setFindStatus(findStatus, "");
    } else {
      setFindStatus(findStatus, "No matches");
    }
    lastQuery = query;
  };

  const openFindBar = () => {
    if (findBar.hidden && document.activeElement instanceof HTMLElement) {
      opener = document.activeElement;
    }
    findBar.hidden = false;
    if (findInput.value.trim()) {
      executeFind(false, true);
    } else {
      setFindStatus(findStatus, "Type to search");
    }
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
    clearSelection();
    if (opener && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  };

  const runZoomCommand = async (operation: () => Promise<number>) => {
    try {
      const zoomFactor = await operation();
      announce(formatZoomAnnouncement(zoomFactor));
    } catch {
      announce("Unable to update zoom level", "assertive");
    }
  };

  findInput.addEventListener("input", () => {
    executeFind(false, true);
  });
  findInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      executeFind(event.shiftKey, false);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeFindBar();
    }
  });
  findPrevButton.addEventListener("click", () => {
    executeFind(true, false);
    findInput.focus();
  });
  findNextButton.addEventListener("click", () => {
    executeFind(false, false);
    findInput.focus();
  });
  findCloseButton.addEventListener("click", () => closeFindBar());

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
    const {activeElement} = document;
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
