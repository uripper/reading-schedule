type LogLevel = "info" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

/**
 * Serializes `Error` instances into plain objects for structured logging.
 * @param error Unknown thrown value.
 * @returns Structured error object for `Error`, otherwise original value.
 */
function normalizeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
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
  const output: LogPayload = {
    level: payload.level,
    message: payload.message,
  };

  if (payload.context !== undefined) {
    output.context = payload.context;
  }

  if (payload.error !== undefined) {
    output.error = normalizeError(payload.error);
  }

  if (payload.level === "error") {
    console.groupCollapsed("[renderer][error]", payload.message);
    console.info(output);
    console.groupEnd();
    return;
  }

  console.info("[renderer][info]", output);
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
    level: "info",
    message,
    context,
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
    level: "error",
    message,
    context,
    error,
  });
}
