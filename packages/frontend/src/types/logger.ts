import { Logger } from "tslog";
import type { LogLevel, LogPayload } from "./types.ts";

interface LoggerMeta {
    context?: Record<string, unknown>;
    error?: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    error: 30,
    info: 20,
};

const LOGGER = new Logger<LoggerMeta>({
    name: "reading-schedule",
});

let currentLogLevel: LogLevel = "debug";

/**
 * Indicates whether a message level should be emitted at current runtime level.
 * @param level - Candidate message level.
 * @returns True when message level meets minimum threshold.
 */
function shouldEmit(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Updates minimum logger level.
 * @param level - New minimum log level.
 */
export function setLogLevel(level: LogLevel): void {
    currentLogLevel = level;
}

/**
 * Serializes `Error` instances into plain objects for structured logging.
 * @param error - Unknown thrown value.
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
 * Builds tslog metadata payload from internal log payload.
 * @param payload - Log payload containing context/error fields.
 * @returns Metadata when fields are available, otherwise undefined.
 */
function toLoggerMeta(payload: LogPayload): LoggerMeta | undefined {
    const META: LoggerMeta = {};

    if (payload.context !== undefined) {
        META.context = payload.context;
    }

    if (payload.error !== undefined) {
        META.error = normalizeError(payload.error);
    }

    if (META.context === undefined && META.error === undefined) {
        return undefined;
    }

    return META;
}

type LoggerMethod = "debug" | "error" | "info";

function loggerMethodForLevel(level: LogLevel): LoggerMethod {
    if (level === "debug") {
        return "debug";
    }

    if (level === "error") {
        return "error";
    }

    return "info";
}

function emitWithOptionalMeta(
    method: LoggerMethod,
    message: string,
    meta: LoggerMeta | undefined,
): void {
    if (meta === undefined) {
        LOGGER[method](message);
        return;
    }

    LOGGER[method](message, meta);
}

/**
 * Emits a structured log through tslog.
 * @param level - Log level to emit.
 * @param message - Human-readable message.
 * @param meta - Optional structured context payload.
 */
function emitTsLog(
    level: LogLevel,
    message: string,
    meta: LoggerMeta | undefined,
): void {
    emitWithOptionalMeta(loggerMethodForLevel(level), message, meta);
}

/**
 * Emits structured logs with level filtering.
 * @param payload - Log payload containing level/message/context/error.
 */
function emitLog(payload: LogPayload): void {
    if (!shouldEmit(payload.level)) {
        return;
    }

    const META = toLoggerMeta(payload);
    emitTsLog(payload.level, payload.message, META);
}

/**
 * Emits debug log event.
 * @param message - Human-readable message.
 * @param context - Optional structured context fields.
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
 * Emits informational log event.
 * @param message - Human-readable message.
 * @param context - Optional structured context fields.
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
 * Emits error log event.
 * @param message - Human-readable message.
 * @param error - Optional error or thrown value.
 * @param context - Optional structured context fields.
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
