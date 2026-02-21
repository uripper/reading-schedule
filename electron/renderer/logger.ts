type LogLevel = "info" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

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
