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

/**
 * Executes a normalized find-in-page request and resolves when results settle.
 * @param webContents Electron webContents to run find against.
 * @param request Normalized find payload.
 * @returns Final find response for the request lifecycle.
 */
async function requestFindInPage(
  webContents: WebContents,
  request: NormalizedWindowFindRequest,
): Promise<WindowFindResponse> {
  return await new Promise((resolve) => {
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
 * @param webContents Electron webContents to run find against.
 * @param payload Raw renderer request payload.
 * @returns Find response containing match counts/active match.
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
  return await requestFindInPage(webContents, request);
}

/**
 * Stops find-in-page and returns an empty find response payload.
 * @param webContents Electron webContents to clear find highlights on.
 * @returns Empty find response payload.
 */
export function stopFindInPage(webContents: WebContents): WindowFindResponse {
  webContents.stopFindInPage("clearSelection");
  return emptyFindResponse();
}

export type { WindowFindRequest, WindowFindResponse } from "./window_find_request.js";
