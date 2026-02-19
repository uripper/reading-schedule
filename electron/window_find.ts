import type { Result as FindInPageEventResult, WebContents } from "electron";

const EMPTY_MATCH_COUNT = 0;
const EMPTY_ACTIVE_MATCH_ORDINAL = 0;
const FIND_RESULT_TIMEOUT_MS = 400;

export type WindowFindRequest = {
  query?: string;
  forward?: boolean;
  findNext?: boolean;
};

export type WindowFindResponse = {
  matches: number;
  activeMatchOrdinal: number;
};

type NormalizedWindowFindRequest = {
  query: string;
  forward: boolean;
  findNext: boolean;
};

function emptyFindResponse(): WindowFindResponse {
  return {
    matches: EMPTY_MATCH_COUNT,
    activeMatchOrdinal: EMPTY_ACTIVE_MATCH_ORDINAL,
  };
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "boolean") {
    return fallback;
  }
  return value;
}

function asQuery(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeFindRequest(payload: WindowFindRequest | null | undefined): NormalizedWindowFindRequest {
  return {
    query: asQuery(payload?.query),
    forward: asBoolean(payload?.forward, true),
    findNext: asBoolean(payload?.findNext, false),
  };
}

function toFindResponse(result: FindInPageEventResult): WindowFindResponse {
  return {
    matches: result.matches,
    activeMatchOrdinal: result.activeMatchOrdinal,
  };
}

function requestFindInPage(webContents: WebContents, request: NormalizedWindowFindRequest): Promise<WindowFindResponse> {
  return new Promise((resolve) => {
    let requestId = -1;
    let latestResponse = emptyFindResponse();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (response: WindowFindResponse) => {
      webContents.removeListener("found-in-page", onFoundInPage);
      if (timer) {
        clearTimeout(timer);
      }
      resolve(response);
    };

    const onFoundInPage = (_event: Electron.Event, result: FindInPageEventResult) => {
      if (result.requestId !== requestId) {
        return;
      }
      latestResponse = toFindResponse(result);
      if (result.finalUpdate) {
        finish(latestResponse);
      }
    };

    webContents.on("found-in-page", onFoundInPage);
    requestId = webContents.findInPage(request.query, {
      forward: request.forward,
      findNext: request.findNext,
      matchCase: false,
    });
    timer = setTimeout(() => {
      finish(latestResponse);
    }, FIND_RESULT_TIMEOUT_MS);
  });
}

export async function findInPage(
  webContents: WebContents,
  payload: WindowFindRequest | null | undefined,
): Promise<WindowFindResponse> {
  const request = normalizeFindRequest(payload);
  if (!request.query) {
    webContents.stopFindInPage("clearSelection");
    return emptyFindResponse();
  }
  return requestFindInPage(webContents, request);
}

export function stopFindInPage(webContents: WebContents): WindowFindResponse {
  webContents.stopFindInPage("clearSelection");
  return emptyFindResponse();
}
