/**
 * Normalizes settings and submits desktop planner generation requests.
 */
import { logDebug } from "@renderer/logger.ts";
import type {
    Book,
    PlanGeneratePayload,
    PlannerSettings,
    PlannerSummary,
    RunPlanGenerationArgs,
} from "../../types/types.ts";
import { todayDayKey } from "./date_keys.ts";
import {
    normalizePlannerEndDate,
    normalizePlannerStartDate,
    plannerTokenFromProfile,
} from "./plan_normalize.ts";

/**
 * Generates a summary log message based on the planner summary data.
 * @param summary - The planner summary data to generate the log message from.
 * @returns A string containing the status and planned/available minutes.
 */
function summaryLog(summary: PlannerSummary | null): string {
    const STATUS = summary?.status ?? "not-set";
    const PLANNED = Number(summary?.total_planned_minutes ?? 0);
    const AVAILABLE = Number(summary?.total_available_minutes ?? 0);
    return `Status ${STATUS}. Planned ${PLANNED}/${AVAILABLE} minutes.`;
}

/**
 * Logs planner summary details and optional feasibility warning.
 * @param summary - Planner summary payload from the generated plan.
 * @param addLog - Log sink used for planner status output.
 */
function logPlanSummary(
    summary: PlannerSummary | null | undefined,
    addLog: (message: string) => void,
): void {
    const FEASIBILITY_WARNING = summary?.feasibility_warning;
    if (typeof FEASIBILITY_WARNING === "string" && FEASIBILITY_WARNING !== "") {
        addLog(FEASIBILITY_WARNING);
    }
    addLog(summaryLog(summary ?? null));
}

/**
 * Trims a string value or returns an empty string if the input is not a valid string.
 * @param value - The value to trim or validate.
 * @returns A trimmed string or an empty string if the input is invalid.
 */
function trimmedStringOrEmpty(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim();
}

/**
 * Extracts a message from an error-like object that has a "message" property.
 * @param error - The error-like object to extract the message from.
 * @returns A trimmed message string or an empty string if the input is not a valid error-like object.
 */
function messageFromErrorLikeObject(error: unknown): string {
    if (typeof error !== "object" || error === null || !("message" in error)) {
        return "";
    }
    return trimmedStringOrEmpty(error.message);
}

/**
 * Extracts a user-friendly error message from an unknown error object,
 * handling various cases such as Error instances, strings, and error-like
 * objects with a "message" property.
 * @param error - The unknown error object to extract the message from.
 * @returns A user-friendly error message string.
 */
function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        const DETAIL = trimmedStringOrEmpty(error.message);
        if (DETAIL) {
            return DETAIL;
        }
        return error.name || "Unknown error";
    }
    const STRING_DETAIL = trimmedStringOrEmpty(error);
    if (STRING_DETAIL) {
        return STRING_DETAIL;
    }
    const MESSAGE_DETAIL = messageFromErrorLikeObject(error);
    if (MESSAGE_DETAIL) {
        return MESSAGE_DETAIL;
    }
    return "Unknown planner error";
}

/**
 * Runs the plan generation process by collecting necessary data, calling the planner API,
 * and handling the results.
 * @param root0 - An object containing the necessary functions and parameters for running the plan generation.
 * @param plannerApi - An object with a "generate" method to call the planner API.
 * @param collectBooks - A function that collects and returns an array of books to be planned.
 * @param collectSettings - A function that collects and returns the planner settings.
 * @param setStatus - A function to update the status message in the UI, with an optional error flag.
 * @param addLog - A function to add a log message to the UI.
 * @param announce - A function to announce a message to the user, with an optional politeness level.
 * @param onSuccess - A function that is called with the planner result data when the plan generation is successful.
 * @param statusGeneratingMessage - An optional custom message to display while the plan is being generated.
 * Defaults to "Generating plan...".
 * @param statusSuccessMessage - An optional custom message to display when the plan generation is successful.
 * Defaults to "Plan generated.".
 * @param successAnnouncement - An optional custom message to announce when the plan generation is successful.
 * Defaults to "Plan generated and schedule updated.".
 */
export async function runPlanGeneration({
    plannerApi,
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    announce,
    onSuccess,
    statusGeneratingMessage = "Generating plan...",
    statusSuccessMessage = "Plan generated.",
    successAnnouncement = "Plan generated and schedule updated.",
}: RunPlanGenerationArgs): Promise<void> {
    try {
        const PAYLOAD_BOOKS = collectBooks();
        logDebug("Plan generation started.", {
            candidateBookCount: PAYLOAD_BOOKS.length,
        });
        if (!PAYLOAD_BOOKS.length) {
            await onSuccess({ schedule: [], summary: null });
            setStatus("No schedulable books to plan.");
            return;
        }

        setStatus(statusGeneratingMessage);
        const SETTINGS = collectSettings();
        const FORCED_START_DATE = todayDayKey();

        const CUSTOM_START_DATE = normalizePlannerStartDate(
            SETTINGS.start_date,
            FORCED_START_DATE,
        );
        const NORMALIZED_END_DATE = normalizePlannerEndDate(
            SETTINGS.end_date,
            CUSTOM_START_DATE,
        );
        const PAYLOAD: PlanGeneratePayload = generatePayload(
            SETTINGS,
            CUSTOM_START_DATE,
            NORMALIZED_END_DATE,
            PAYLOAD_BOOKS,
        );

        const DATA = await plannerApi.generate(PAYLOAD);
        await onSuccess(DATA);
        logPlanSummary(DATA.summary, addLog);
        logDebug("Planner payload resolved successfully.", {
            scheduleRows: DATA.schedule.length,
            status: DATA.summary?.status ?? null,
        });

        setStatus(statusSuccessMessage);
        if (successAnnouncement !== "") {
            announce(successAnnouncement);
        }
    } catch (error) {
        const MESSAGE = "Failed to generate plan";
        setStatus(MESSAGE, true);
        addLog(`Plan generation error: ${errorMessage(error)}`);
        logDebug("Planner payload failed.", {
            detail: errorMessage(error),
        });
        announce(MESSAGE, "assertive");
    }
}

/**
 * Builds the final planner payload from normalized settings and books.
 * @param settings - Collected planner settings.
 * @param customStartDate - Normalized effective start date.
 * @param normalizedEndDate - Normalized end date or undefined.
 * @param payloadBooks - Books included in the request.
 * @returns Planner API payload.
 */
function generatePayload(
    settings: PlannerSettings,
    customStartDate: string,
    normalizedEndDate: string | undefined,
    payloadBooks: Book[],
): PlanGeneratePayload {
    const PAYLOAD_SETTINGS = {
        ...settings,
        start_date: customStartDate,
    };
    if (normalizedEndDate !== undefined && normalizedEndDate !== "") {
        PAYLOAD_SETTINGS.end_date = normalizedEndDate;
    }
    const PLANNER_TOKEN = plannerTokenFromProfile(
        PAYLOAD_SETTINGS.planner_solver_profile,
    );
    const PAYLOAD: PlanGeneratePayload = {
        books: payloadBooks,
        planner: PLANNER_TOKEN,
        settings: PAYLOAD_SETTINGS,
    };
    logDebug("Submitting planner payload.", {
        bookCount: PAYLOAD.books.length,
        endDate: PAYLOAD.settings.end_date ?? null,
        planner: PAYLOAD.planner,
        startDate: PAYLOAD.settings.start_date,
    });
    return PAYLOAD;
}
