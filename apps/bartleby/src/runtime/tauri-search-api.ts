import type {
    BookLookupItem,
    BookSearchDiagnostic,
    BookSearchResponse,
    PlannerApi,
} from "@reading-schedule/contracts";
import {
    logDebug,
    logError,
} from "../../../../packages/frontend/src/types/logger.ts";
import type { TauriPlannerCommand } from "./tauri-commands.ts";
import { TAURI_COMMANDS } from "./tauri-commands.ts";

type InvokeCommand = <T>(
    command: TauriPlannerCommand,
    args?: Record<string, unknown>,
) => Promise<T>;

const UNKNOWN_RESPONSE_REASON = "invalid_bridge_response";
const UNKNOWN_RESPONSE_KIND = "bridge";
const REQUEST_DIAGNOSTIC_REASONS = new Set([
    "rate_limited",
    "request_completed",
    "request_failed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function fallbackDiagnostics(value: unknown): BookSearchDiagnostic[] {
    return [
        {
            detail: `Expected book search response object, received ${typeof value}.`,
            reason: UNKNOWN_RESPONSE_REASON,
            request_kind: UNKNOWN_RESPONSE_KIND,
        },
    ];
}

function optionalNumber(value: unknown): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }
    return value;
}

function optionalString(value: unknown): string | undefined {
    if (typeof value !== "string" || value.trim().length === 0) {
        return undefined;
    }
    return value;
}

function diagnosticFromRecord(
    diagnostic: Record<string, unknown>,
): BookSearchDiagnostic {
    return {
        detail: String(diagnostic.detail ?? ""),
        elapsed_ms: optionalNumber(diagnostic.elapsed_ms),
        reason: String(diagnostic.reason ?? UNKNOWN_RESPONSE_REASON),
        request_kind: String(diagnostic.request_kind ?? UNKNOWN_RESPONSE_KIND),
        retry_after: optionalString(diagnostic.retry_after),
        status: optionalNumber(diagnostic.status),
    };
}

function diagnosticsFromValue(value: unknown): BookSearchDiagnostic[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isRecord).map(diagnosticFromRecord);
}

function normalizedBookSearchResponse(value: unknown): BookSearchResponse {
    if (Array.isArray(value)) {
        return {
            diagnostics: [],
            items: value as BookLookupItem[],
        };
    }
    if (!isRecord(value)) {
        return {
            diagnostics: fallbackDiagnostics(value),
            items: [],
        };
    }
    const ITEMS = value.items;
    if (Array.isArray(ITEMS)) {
        return {
            diagnostics: diagnosticsFromValue(value.diagnostics),
            items: ITEMS as BookLookupItem[],
        };
    }
    return {
        diagnostics: fallbackDiagnostics(value),
        items: [],
    };
}

function logBookSearchStarted(options: {
    author: boolean;
    query: string;
}): void {
    logDebug("Open Library lookup started.", {
        author: options.author,
        query: options.query,
    });
}

function logBookSearchCompleted(options: {
    author: boolean;
    elapsedMs: number;
    query: string;
    response: BookSearchResponse;
}): void {
    const DIAGNOSTICS = options.response.diagnostics;
    logDebug("Open Library lookup completed.", {
        author: options.author,
        diagnostics: DIAGNOSTICS,
        elapsedMs: options.elapsedMs,
        query: options.query,
        requestCount: requestDiagnosticCount(DIAGNOSTICS),
        resultCount: options.response.items.length,
        slowestRequestMs: slowestRequestMs(DIAGNOSTICS),
    });
}

function requestDiagnosticCount(
    diagnostics: readonly BookSearchDiagnostic[],
): number {
    return diagnostics.filter((diagnostic) =>
        REQUEST_DIAGNOSTIC_REASONS.has(diagnostic.reason),
    ).length;
}

function slowestRequestMs(
    diagnostics: readonly BookSearchDiagnostic[],
): number {
    return diagnostics.reduce((slowest, diagnostic) => {
        if (diagnostic.elapsed_ms === undefined) {
            return slowest;
        }
        return Math.max(slowest, diagnostic.elapsed_ms);
    }, 0);
}

function elapsedMs(startedAt: number): number {
    return Math.round(performance.now() - startedAt);
}

async function runBookSearch(options: {
    author: boolean;
    invokeCommand: InvokeCommand;
    query: string;
    startedAt: number;
}): Promise<BookLookupItem[]> {
    const RESULT = await options.invokeCommand<unknown>(
        TAURI_COMMANDS.booksSearch,
        {
            author: options.author,
            query: options.query,
        },
    );
    const RESPONSE = normalizedBookSearchResponse(RESULT);
    logBookSearchCompleted({
        author: options.author,
        elapsedMs: elapsedMs(options.startedAt),
        query: options.query,
        response: RESPONSE,
    });
    return RESPONSE.items;
}

async function searchBooks(
    invokeCommand: InvokeCommand,
    query: string,
    author: boolean,
): Promise<BookLookupItem[]> {
    const STARTED_AT = performance.now();
    logBookSearchStarted({ author, query });
    try {
        return await runBookSearch({
            author,
            invokeCommand,
            query,
            startedAt: STARTED_AT,
        });
    } catch (error: unknown) {
        logError("Open Library lookup failed.", error, {
            author,
            elapsedMs: elapsedMs(STARTED_AT),
            query,
        });
        throw error;
    }
}

export function createSearchApi(
    invokeCommand: InvokeCommand,
): Pick<PlannerApi, "searchBooks"> {
    return {
        async searchBooks(
            query: string,
            author = false,
        ): Promise<BookLookupItem[]> {
            return await searchBooks(invokeCommand, query, author);
        },
    };
}
