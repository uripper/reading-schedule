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

/**
 * Coerces unknown input into a boolean with a fallback default.
 * @param value Candidate boolean input.
 * @param fallback Default value when input is not boolean.
 * @returns Normalized boolean value.
 */
function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "boolean") {
    return fallback;
  }
  return value;
}

/**
 * Coerces unknown input into a trimmed query string.
 * @param value Candidate query input.
 * @returns Trimmed query string or empty string for invalid input.
 */
function asQuery(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

/**
 * Creates the default empty find response returned for cleared searches.
 * @returns Find response with zero matches.
 */
export function emptyFindResponse(): WindowFindResponse {
  return {
    matches: EMPTY_MATCH_COUNT,
    activeMatchOrdinal: EMPTY_ACTIVE_MATCH_ORDINAL,
  };
}

/**
 * Coerces renderer find payload values into a safe normalized request.
 * @param payload Renderer find payload.
 * @returns Normalized find request used by main-process APIs.
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
 * @param result Electron find-in-page event payload.
 * @returns Renderer-safe find response object.
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
