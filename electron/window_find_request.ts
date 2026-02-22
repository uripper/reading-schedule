/**
 * @file Normalization and mapping for find-in-page IPC request payloads.
 */
import type { Result as FindInPageEventResult } from "electron";
import type {
  WindowFindRequest,
  WindowFindResponse,
} from "./renderer/shared/window_find_types.js";

const EMPTY_MATCH_COUNT = 0;
const EMPTY_ACTIVE_MATCH_ORDINAL = 0;

/**
 * Canonical request shape used by the main-process find helpers.
 */
export interface NormalizedWindowFindRequest {
  query: string;
  forward: boolean;
  findNext: boolean;
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

/**
 * Creates the default empty find response returned for cleared searches.
 */
export function emptyFindResponse(): WindowFindResponse {
  return {
    matches: EMPTY_MATCH_COUNT,
    activeMatchOrdinal: EMPTY_ACTIVE_MATCH_ORDINAL,
  };
}

/**
 * Coerces renderer find payload values into a safe normalized request.
 */
export function normalizeFindRequest(
  payload: WindowFindRequest | null | undefined,
): NormalizedWindowFindRequest {
  return {
    query: asQuery(payload?.query),
    forward: asBoolean(payload?.forward, true),
    findNext: asBoolean(payload?.findNext, false),
  };
}

/**
 * Maps an Electron found-in-page event result into renderer response shape.
 */
export function toFindResponse(
  result: FindInPageEventResult,
): WindowFindResponse {
  return {
    matches: result.matches,
    activeMatchOrdinal: result.activeMatchOrdinal,
  };
}

export type { WindowFindRequest, WindowFindResponse } from "./renderer/shared/window_find_types.js";
