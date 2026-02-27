import type { WindowFindResponse } from "../../types/types.js";
import { logError } from "../logger.js";
import { bindFindEvents } from "./desktop_shortcuts_find_bindings.js";
import { isCommandPressed } from "./desktop_shortcuts_keys.js";
import type {
  FindController,
  FindControllerArgs,
  FindApi,
} from "./desktop_shortcuts_find_types.js";

const FIND_STATUS_HINT = "Type to search";
const FIND_STATUS_NO_MATCH = "No matches";
const FIND_STATUS_FAILED = "Search failed";
type FindDirection = "next" | "prev";

interface FindControllerState {
  lastQuery: string;
  opener: HTMLElement | null;
  requestCounter: number;
}

interface FindControllerContext {
  announce(message: string, politeness?: "polite" | "assertive"): void;
  findBar: HTMLElement;
  findInput: HTMLInputElement;
  findStatus: HTMLOutputElement;
  plannerApi: FindApi;
  state: FindControllerState;
}

const setFindStatus = (target: HTMLOutputElement, message: string): void => {
  const nextTarget = target;
  nextTarget.value = message;
  nextTarget.textContent = message;
};

const formatFindStatus = (result: WindowFindResponse): string => {
  if (result.matches <= 0) {
    return FIND_STATUS_NO_MATCH;
  }
  return `${result.activeMatchOrdinal} of ${result.matches}`;
};

const clearFindForEmptyQuery = async (
  context: FindControllerContext,
): Promise<void> => {
  const { state } = context;
  state.lastQuery = "";
  setFindStatus(context.findStatus, FIND_STATUS_HINT);
  state.requestCounter += 1;
  try {
    await context.plannerApi.stopFindInPage();
  } catch (error: unknown) {
    logError("Failed to clear find highlights", error);
    context.announce("Unable to clear search results", "assertive");
  }
};

const executeFindCommand = async (
  context: FindControllerContext,
  direction: FindDirection,
  forceNextForSameQuery: boolean,
): Promise<void> => {
  const query = context.findInput.value.trim();
  if (query === "") {
    await clearFindForEmptyQuery(context);
    return;
  }
  const { state } = context;
  let findNext = false;
  if (query === state.lastQuery && forceNextForSameQuery) {
    findNext = true;
  }
  state.requestCounter += 1;
  const currentRequest = state.requestCounter;
  try {
    const result = await context.plannerApi.findInPage({
      query,
      findNext,
      forward: direction === "next",
    });
    if (currentRequest !== state.requestCounter) {
      return;
    }
    setFindStatus(context.findStatus, formatFindStatus(result));
    state.lastQuery = query;
  } catch (error: unknown) {
    logError("Find operation failed", error);
    context.announce("Unable to search the page", "assertive");
    setFindStatus(context.findStatus, FIND_STATUS_FAILED);
  }
};

const openFindBar = (context: FindControllerContext): void => {
  const { findBar, findInput, state } = context;
  if (findBar.hidden && document.activeElement instanceof HTMLElement) {
    state.opener = document.activeElement;
  }
  findBar.hidden = false;
  setFindStatus(context.findStatus, FIND_STATUS_HINT);
  findInput.focus();
  findInput.select();
};

const closeFindBar = (context: FindControllerContext): void => {
  const { findBar, findInput, state } = context;
  if (findBar.hidden) {
    return;
  }
  findBar.hidden = true;
  findInput.value = "";
  state.lastQuery = "";
  setFindStatus(context.findStatus, "");
  state.requestCounter += 1;
  context.plannerApi.stopFindInPage().catch((error: unknown) => {
    logError("Failed to clear find highlights", error);
    context.announce("Unable to clear search results", "assertive");
  });
  const { opener } = state;
  if (opener?.isConnected === true) {
    opener.focus();
  }
  state.opener = null;
};

/**
 * Creates handlers for find-bar lifecycle, keyboard shortcuts, and navigation.
 * @param args Find controller dependencies and DOM bindings.
 * @returns Controller object for binding and shortcut handling.
 */
export function createFindControllerImpl(
  args: FindControllerArgs,
): FindController {
  const context: FindControllerContext = {
    announce(message: string, politeness?: "polite" | "assertive"): void {
      args.announce(message, politeness);
    },
    findBar: args.findBar,
    findInput: args.findInput,
    findStatus: args.findStatus,
    plannerApi: args.plannerApi,
    state: { lastQuery: "", opener: null, requestCounter: 0 },
  };
  const bind = (): void => {
    bindFindEvents({
      closeFindBar: (): void => {
        closeFindBar(context);
      },
      findCloseButton: args.findCloseButton,
      findInput: args.findInput,
      findNextButton: args.findNextButton,
      findPrevButton: args.findPrevButton,
      runFindCommand: async (
        direction: FindDirection,
        forceNextForSameQuery: boolean,
      ): Promise<void> => {
        await executeFindCommand(context, direction, forceNextForSameQuery);
      },
    });
  };
  const handleFindShortcut = (event: KeyboardEvent): boolean => {
    if (!isCommandPressed(event) || (event.key !== "f" && event.key !== "F")) {
      return false;
    }
    event.preventDefault();
    openFindBar(context);
    return true;
  };
  const handleFindBarEscape = (event: KeyboardEvent): boolean => {
    const { findBar } = args;
    if (event.key !== "Escape" || findBar.hidden) {
      return false;
    }
    const { activeElement } = document;
    if (
      activeElement instanceof HTMLElement &&
      findBar.contains(activeElement)
    ) {
      event.preventDefault();
      closeFindBar(context);
      return true;
    }
    return false;
  };
  return { bind, handleFindBarEscape, handleFindShortcut };
}
