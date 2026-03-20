/**
 * @file Shared logger for Electron Node scripts.
 */

const INFO_PREFIX = "[scripts][info]";
const ERROR_PREFIX = "[scripts][error]";
const LINE_BREAK = "\n";
const UNSERIALIZABLE_CONTEXT = "[unserializable-context]";

/**
 * Safely serializes values for log output.
 * @param {unknown} value - Value to serialize.
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
 * @param {unknown} error - Thrown value.
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
 * @param {object} root0 - Log line inputs.
 * @param {string} root0.message - Log message.
 * @param {unknown} root0.payload - Optional payload.
 * @param {string} root0.prefix - Level prefix.
 * @param {NodeJS.WriteStream} root0.stream - Destination stream.
 */
function writeLogLine({ message, payload, prefix, stream }) {
    let line = `${prefix} ${message}`;
    if (payload !== undefined) {
        line = `${line} ${safeSerialize(payload)}`;
    }
    stream.write(`${line}${LINE_BREAK}`);
}

/**
 * Builds an error payload object only when error details exist.
 * @param {unknown} error - Optional thrown value.
 * @param {unknown} context - Optional context payload.
 * @returns {unknown} Structured payload or `undefined`.
 */
function errorPayload(error, context) {
    if (error === undefined && context === undefined) {
        return undefined;
    }

    const PAYLOAD = {};
    if (error !== undefined) {
        PAYLOAD.error = normalizeError(error);
    }
    if (context !== undefined) {
        PAYLOAD.context = context;
    }
    return PAYLOAD;
}

/**
 * Emits an info-level log line.
 * @param {string} message - Log message.
 * @param {unknown} payload - Optional context payload.
 */
export function logInfo(message, payload) {
    writeLogLine({
        message,
        payload,
        prefix: INFO_PREFIX,
        stream: process.stdout,
    });
}

/**
 * Emits an error-level log line.
 * @param {string} message - Log message.
 * @param {unknown} error - Optional thrown value.
 * @param {unknown} context - Optional context payload.
 */
export function logError(message, error, context) {
    writeLogLine({
        message,
        payload: errorPayload(error, context),
        prefix: ERROR_PREFIX,
        stream: process.stderr,
    });
}
