import { logDebug } from "@renderer/logger.js";
import type {
    Book,
    PlanGeneratePayload,
    PlannerSettings,
    PlannerSummary,
    PlannerToken,
    RunPlanGenerationArgs,
} from "../../types/types.js";
import { dayKeyFromDate } from "./date_keys.js";

/**
 * Generates a day key for tomorrow's date in the format "YYYY-MM-DD".
 * @returns A string representing tomorrow's day key in "YYYY-MM-DD" format.
 */
function tomorrowDayKey(): string {
    const TOMORROW = new Date();
    TOMORROW.setDate(TOMORROW.getDate() + 1);
    return dayKeyFromDate(TOMORROW);
}

/**
 * Maps settings solver profile to planner token accepted by the bridge.
 * @param profileRaw - Raw settings profile value.
 * @returns Planner token for Python solve strategy selection.
 */
function plannerTokenFromProfile(profileRaw: unknown): PlannerToken {
    // TODO: We are going to temporarily break this by sending everything to fast
    // THIS MUST BE FIXED EVENTUALLY!
    if (profileRaw === "fast") {
        return "mip-fast";
    }
    if (profileRaw === "thorough") {
        return "mip-fast";
    }
    if (profileRaw === "balanced") {
        return "mip-fast";
    }
    return "mip-fast";
}

/**
 * Normalizes the end date by ensuring it is a valid string and not before the start date.
 * @param endDate - The end date to normalize.
 * @param startDate - The start date to compare against.
 * @returns A normalized end date string or undefined if the input is invalid.
 */
function normalizeEndDate(
    endDate: unknown,
    startDate: string,
): string | undefined {
    if (typeof endDate !== "string" || !endDate) {
        return undefined;
    }
    const NORMALIZED_END_DATE = endDate.trim();
    if (NORMALIZED_END_DATE === "") {
        return undefined;
    }
    if (NORMALIZED_END_DATE < startDate) {
        return startDate;
    }
    return NORMALIZED_END_DATE;
}

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
        const FORCED_START_DATE = tomorrowDayKey();

        const CustomStartDate: string = checkCustomStartDate(
            FORCED_START_DATE,
            SETTINGS,
        );
        const NORMALIZED_END_DATE = normalizeEndDate(
            SETTINGS.end_date,
            CustomStartDate,
        );
        const PAYLOAD: PlanGeneratePayload = generatePayload(
            SETTINGS,
            CustomStartDate,
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

function generatePayload(
    settings: PlannerSettings,
    customStartDate: string,
    normalizedEndDate: string | undefined,
    payloadBooks: Book[],
) {
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

function checkCustomStartDate(
    forcedStartDate: string,
    settings: PlannerSettings,
) {
    let custom_start_date = settings.start_date;
    if (
        typeof custom_start_date !== "string" ||
        Number.isNaN(Date.parse(custom_start_date))
    ) {
        custom_start_date = forcedStartDate;
    } else {
        custom_start_date = custom_start_date.trim();
        if (custom_start_date === "") {
            custom_start_date = forcedStartDate;
        }
    }
    return custom_start_date;
}
