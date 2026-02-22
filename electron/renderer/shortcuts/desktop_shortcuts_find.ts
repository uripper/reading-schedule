import type { PlannerApi, WindowFindResponse } from "../app/types.js";
import { isCommandPressed } from "./desktop_shortcuts_keys.js";
import { logError } from "../logger.js";

const FIND_STATUS_HINT = "Type to search";
const FIND_STATUS_NO_MATCH = "No matches";
const FIND_STATUS_FAILED = "Search failed";

type FindApi = Pick<PlannerApi, "findInPage" | "stopFindInPage">;

interface FindControllerArgs {
  announce(message: string, politeness?: "polite" | "assertive"): void;
  findBar: HTMLElement;
  findCloseButton: HTMLButtonElement;
  findInput: HTMLInputElement;
  findNextButton: HTMLButtonElement;
  findPrevButton: HTMLButtonElement;
  findStatus: HTMLOutputElement;
  plannerApi: FindApi;
}

/**
 * Updates the visible and announced text for the find status output.
 * @param target Output element showing the current find status.
 * @param message Status message to render.
 * @returns Nothing.
 */
function setFindStatus(target: HTMLOutputElement, message: string): void {
  target.value = message;
  target.textContent = message;
  return undefined;
}

/**
 * Converts a find response into user-facing match progress text.
 * @param result IPC response from the find-in-page operation.
 * @returns Human-readable find status text.
 */
function formatFindStatus(result: WindowFindResponse): string {
  if (result.matches <= 0) {
    return FIND_STATUS_NO_MATCH;
  }
  return `${result.activeMatchOrdinal} of ${result.matches}`;
}

/**
 * Creates handlers for find-bar lifecycle, keyboard shortcuts, and navigation.
 * @param root0 Find controller dependencies and DOM bindings.
 * @param root0.announce Live-region announcer for find failures.
 * @param root0.findBar Container element for the find controls.
 * @param root0.findCloseButton Button that closes the find bar.
 * @param root0.findInput Text input for the query.
 * @param root0.findNextButton Button that jumps to next match.
 * @param root0.findPrevButton Button that jumps to previous match.
 * @param root0.findStatus Output element used for match feedback.
 * @param root0.plannerApi IPC bridge methods for find operations.
 * @returns Controller object for binding and shortcut handling.
 */
export function createFindController({
  announce,
  findBar,
  findCloseButton,
  findInput,
  findNextButton,
  findPrevButton,
  findStatus,
  plannerApi,
}: FindControllerArgs): {
  bind(): void;
  handleFindBarEscape(event: KeyboardEvent): boolean;
  handleFindShortcut(event: KeyboardEvent): boolean;
} {
  let lastQuery = "";
  let opener: HTMLElement | null = null;
  let requestCounter = 0;
  const runFindCommand = async (
    direction: "next" | "prev",
    forceNextForSameQuery: boolean,
  ) => {
    const query = findInput.value.trim();
    if (!query) {
      lastQuery = "";
      setFindStatus(findStatus, FIND_STATUS_HINT);
      requestCounter += 1;
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
    requestCounter += 1;
    const currentRequest = requestCounter;
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
      setFindStatus(findStatus, FIND_STATUS_FAILED);
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
    requestCounter += 1;
    plannerApi.stopFindInPage().catch((error) => {
      logError("Failed to clear find highlights", error);
      announce("Unable to clear search results", "assertive");
    });
    if (opener?.isConnected) {
      opener.focus();
    }
    opener = null;
  };
  const runDetached = (operation: Promise<void>) => {
    operation.catch((error) => {
      logError("Shortcut command failed", error);
    });
  };
  const bind = (): void => {
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
  };
  const handleFindShortcut = (event: KeyboardEvent): boolean => {
    if (!isCommandPressed(event) || (event.key !== "f" && event.key !== "F")) {
      return false;
    }
    event.preventDefault();
    openFindBar();
    return true;
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
  return {
    bind,
    handleFindShortcut,
    handleFindBarEscape,
  };
}
