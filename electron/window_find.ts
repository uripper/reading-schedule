/**
 * @file Main-process wrappers around Electron's find-in-page APIs.
 */
import type { Result as FindInPageEventResult, WebContents } from "electron";
import {
  emptyFindResponse,
  normalizeFindRequest,
  toFindResponse,
  type NormalizedWindowFindRequest,
  type WindowFindRequest,
  type WindowFindResponse,
} from "./window_find_request.js";

const FIND_RESULT_TIMEOUT_MS = 400;

function requestFindInPage(
  webContents: WebContents,
  request: NormalizedWindowFindRequest,
): Promise<WindowFindResponse> {
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

    const onFoundInPage = (
      _event: Electron.Event,
      result: FindInPageEventResult,
    ) => {
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

/**
 * Starts or updates an in-page find operation for the provided payload.
 */
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

/**
 * Stops find-in-page and returns an empty find response payload.
 */
export function stopFindInPage(webContents: WebContents): WindowFindResponse {
  webContents.stopFindInPage("clearSelection");
  return emptyFindResponse();
}

export type { WindowFindRequest, WindowFindResponse } from "./window_find_request.js";
