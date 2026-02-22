import type { Result as FindInPageEventResult } from "electron";

const EMPTY_MATCH_COUNT = 0;
const EMPTY_ACTIVE_MATCH_ORDINAL = 0;

export type WindowFindRequest = {
  query?: string;
  forward?: boolean;
  findNext?: boolean;
};

export type WindowFindResponse = {
  matches: number;
  activeMatchOrdinal: number;
};

export type NormalizedWindowFindRequest = {
  query: string;
  forward: boolean;
  findNext: boolean;
};

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

export function emptyFindResponse(): WindowFindResponse {
  return {
    matches: EMPTY_MATCH_COUNT,
    activeMatchOrdinal: EMPTY_ACTIVE_MATCH_ORDINAL,
  };
}

export function normalizeFindRequest(
  payload: WindowFindRequest | null | undefined,
): NormalizedWindowFindRequest {
  return {
    query: asQuery(payload?.query),
    forward: asBoolean(payload?.forward, true),
    findNext: asBoolean(payload?.findNext, false),
  };
}

export function toFindResponse(
  result: FindInPageEventResult,
): WindowFindResponse {
  return {
    matches: result.matches,
    activeMatchOrdinal: result.activeMatchOrdinal,
  };
}
