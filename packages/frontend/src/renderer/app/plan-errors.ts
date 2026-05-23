export const PLANNER_SUPERSEDED_MESSAGE = "Planner request superseded.";

function trimmedStringOrEmpty(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim();
}

function messageFromErrorLikeObject(error: unknown): string {
    if (typeof error !== "object" || error === null || !("message" in error)) {
        return "";
    }
    return trimmedStringOrEmpty(error.message);
}

function namedErrorMessage(error: Error): string {
    const DETAIL = trimmedStringOrEmpty(error.message);
    if (DETAIL !== "") {
        return DETAIL;
    }
    if (error.name !== "") {
        return error.name;
    }
    return "Unknown error";
}

function detailFromUnknownError(error: unknown): string {
    const STRING_DETAIL = trimmedStringOrEmpty(error);
    if (STRING_DETAIL !== "") {
        return STRING_DETAIL;
    }
    return messageFromErrorLikeObject(error);
}

export function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return namedErrorMessage(error);
    }
    const DETAIL = detailFromUnknownError(error);
    if (DETAIL !== "") {
        return DETAIL;
    }
    return "Unknown planner error";
}

export function isPlannerSupersededError(error: unknown): boolean {
    return errorMessage(error) === PLANNER_SUPERSEDED_MESSAGE;
}
