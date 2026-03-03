import type { LogPayload } from "../types/types.js";

const LOG_LEVEL_PRIORITY: Record<LogPayload["level"], number> = {
    debug: 10,
    error: 30,
    info: 20,
};

let currentLogLevel: LogPayload["level"] = "debug";

/**
 * Indicates whether a message level should be emitted at current runtime level.
 * @param level Candidate message level.
 * @returns True when message level meets minimum threshold.
 */
function shouldEmit(level: LogPayload["level"]): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Updates minimum renderer log level.
 * @param level New minimum log level.
 */
export function setLogLevel(level: LogPayload["level"]): void {
    currentLogLevel = level;
}

/**
 * Serializes `Error` instances into plain objects for structured logging.
 * @param error Unknown thrown value.
 * @returns Structured error object for `Error`, otherwise original value.
 */
function normalizeError(error: unknown): unknown {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
        };
    }
    return error;
}

/**
 * Emits structured renderer logs to console with consistent prefixes.
 * @param payload Log payload containing level/message/context/error.
 */
function emitLog(payload: LogPayload): void {
    if (!shouldEmit(payload.level)) {
        return;
    }

    const OUTPUT: LogPayload = {
        level: payload.level,
        message: payload.message,
    };

    if (payload.context !== undefined) {
        OUTPUT.context = payload.context;
    }

    if (payload.error !== undefined) {
        OUTPUT.error = normalizeError(payload.error);
    }

    if (payload.level === "error") {
        // biome-ignore lint/suspicious/noConsole: renderer logger intentionally writes structured logs.
        console.groupCollapsed("[renderer][error]", payload.message);
        // biome-ignore lint/suspicious/noConsole: renderer logger intentionally writes structured logs.
        console.info(OUTPUT);
        // biome-ignore lint/suspicious/noConsole: renderer logger intentionally writes structured logs.
        console.groupEnd();
        return;
    }

    if (payload.level === "debug") {
        // biome-ignore lint/suspicious/noConsole: renderer logger intentionally writes structured logs.
        console.info("[renderer][debug]", OUTPUT);
        return;
    }

    // biome-ignore lint/suspicious/noConsole: renderer logger intentionally writes structured logs.
    console.info("[renderer][info]", OUTPUT);
}

/**
 * Emits debug renderer log event.
 * @param message Human-readable message.
 * @param context Optional structured context fields.
 */
export function logDebug(
    message: string,
    context?: Record<string, unknown>,
): void {
    emitLog({
        context,
        level: "debug",
        message,
    });
}

/**
 * Emits informational renderer log event.
 * @param message Human-readable message.
 * @param context Optional structured context fields.
 */
export function logInfo(
    message: string,
    context?: Record<string, unknown>,
): void {
    emitLog({
        context,
        level: "info",
        message,
    });
}

/**
 * Emits error renderer log event.
 * @param message Human-readable message.
 * @param error Optional error or thrown value.
 * @param context Optional structured context fields.
 */
export function logError(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
): void {
    emitLog({
        context,
        error,
        level: "error",
        message,
    });
}
