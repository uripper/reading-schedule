/**
 * @file Shared logger for Electron Node scripts.
 */

const INFO_PREFIX = "[scripts][info]";
const ERROR_PREFIX = "[scripts][error]";
const LINE_BREAK = "\n";
const UNSERIALIZABLE_CONTEXT = "[unserializable-context]";

/**
 * Safely serializes values for log output.
 * @param {unknown} value Value to serialize.
 * @returns {string} JSON string when possible.
 */
function safeSerialize(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return UNSERIALIZABLE_CONTEXT;
    }
}

/**
 * Normalizes unknown errors for structured output.
 * @param {unknown} error Thrown value.
 * @returns {unknown} Normalized error payload.
 */
function normalizeError(error) {
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
 * Writes a formatted log line to the selected stream.
 * @param {NodeJS.WriteStream} stream Destination stream.
 * @param {string} prefix Level prefix.
 * @param {string} message Log message.
 * @param {unknown} payload Optional payload.
 */
function writeLogLine(stream, prefix, message, payload) {
    let line = `${prefix} ${message}`;
    if (payload !== undefined) {
        line = `${line} ${safeSerialize(payload)}`;
    }
    stream.write(`${line}${LINE_BREAK}`);
}

/**
 * Emits an info-level log line.
 * @param {string} message Log message.
 * @param {unknown} payload Optional context payload.
 */
export function logInfo(message, payload) {
    writeLogLine(process.stdout, INFO_PREFIX, message, payload);
}

/**
 * Emits an error-level log line.
 * @param {string} message Log message.
 * @param {unknown} error Optional thrown value.
 * @param {unknown} context Optional context payload.
 */
export function logError(message, error, context) {
    let payload;
    if (error !== undefined || context !== undefined) {
        payload = {};
    }
    if (error !== undefined && payload !== undefined) {
        payload.error = normalizeError(error);
    }
    if (context !== undefined && payload !== undefined) {
        payload.context = context;
    }
    writeLogLine(process.stderr, ERROR_PREFIX, message, payload);
}
