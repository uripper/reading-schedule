/**
 * Normalizes settings and submits desktop planner generation requests.
 */

import { logDebug } from "../../types/logger.ts";
import type {
    Book,
    PlanGeneratePayload,
    PlannerSettings,
    RunPlanGenerationArgs,
} from "../../types/types.ts";
import { todayDayKey } from "./date_keys.ts";
import {
    normalizePlannerEndDate,
    normalizePlannerStartDate,
} from "./plan_normalize.ts";
import { errorMessage, isPlannerSupersededError } from "./plan-errors.ts";
import type { PlanMessages } from "./plan-feedback.ts";
import { logPlanSummary, resolvedPlanMessages } from "./plan-feedback.ts";

interface GeneratePayloadArgs {
    customStartDate: string;
    normalizedEndDate: string | undefined;
    payloadBooks: Book[];
    settings: PlannerSettings;
}

interface PlanSuccessArgs {
    addLog(message: string): void;
    announce(message: string, politeness?: "polite" | "assertive"): void;
    data: Awaited<ReturnType<RunPlanGenerationArgs["plannerApi"]["generate"]>>;
    onSuccess(
        data: Awaited<
            ReturnType<RunPlanGenerationArgs["plannerApi"]["generate"]>
        >,
    ): Promise<void>;
    setStatus: RunPlanGenerationArgs["setStatus"];
    statusSuccessMessage: string;
    successAnnouncement: string;
}

interface PlanFailureArgs {
    addLog(message: string): void;
    announce(message: string, politeness?: "polite" | "assertive"): void;
    error: unknown;
    setStatus: RunPlanGenerationArgs["setStatus"];
}

function buildPlanPayload(
    settings: PlannerSettings,
    payloadBooks: Book[],
): PlanGeneratePayload {
    const FORCED_START_DATE = todayDayKey();
    const CUSTOM_START_DATE = normalizePlannerStartDate(
        settings.start_date,
        FORCED_START_DATE,
    );
    const NORMALIZED_END_DATE = normalizePlannerEndDate(
        settings.end_date,
        CUSTOM_START_DATE,
    );

    return generatePayload({
        customStartDate: CUSTOM_START_DATE,
        normalizedEndDate: NORMALIZED_END_DATE,
        payloadBooks,
        settings,
    });
}

async function handlePlanSuccess({
    addLog,
    announce,
    data,
    onSuccess,
    setStatus,
    statusSuccessMessage,
    successAnnouncement,
}: PlanSuccessArgs): Promise<void> {
    await onSuccess(data);
    logPlanSummary(data.summary, data.schedule, addLog);
    logDebug("Planner payload resolved successfully.", {
        scheduleRows: data.schedule.length,
        status: data.summary?.status ?? null,
    });
    setStatus(statusSuccessMessage, false, "success");

    if (successAnnouncement !== "") {
        announce(successAnnouncement);
    }
}

function handlePlanFailure({
    addLog,
    announce,
    error,
    setStatus,
}: PlanFailureArgs): void {
    const MESSAGE = "Failed to generate plan";

    setStatus(MESSAGE, true, "error");
    addLog(`Plan generation error: ${errorMessage(error)}`);
    logDebug("Planner payload failed.", {
        detail: errorMessage(error),
    });
    announce(MESSAGE, "assertive");
}

function logPlanGenerationStarted(payloadBooks: Book[]): void {
    logDebug("Plan generation started.", {
        candidateBookCount: payloadBooks.length,
    });
}

function currentRunFromCallback(
    isRunCurrent: RunPlanGenerationArgs["isRunCurrent"],
): boolean {
    if (isRunCurrent === undefined) {
        return true;
    }
    return isRunCurrent();
}

function runIsCurrent(args: RunPlanGenerationArgs): boolean {
    return currentRunFromCallback(args.isRunCurrent);
}

async function handleNoSchedulableBooks(args: {
    isRunCurrent?: RunPlanGenerationArgs["isRunCurrent"];
    onSuccess: RunPlanGenerationArgs["onSuccess"];
    setStatus: RunPlanGenerationArgs["setStatus"];
}): Promise<void> {
    if (!currentRunFromCallback(args.isRunCurrent)) {
        return;
    }
    await args.onSuccess({ schedule: [], summary: null });
    args.setStatus("No schedulable books to plan.", false, "success");
}

function requestGeneratedPlan(
    args: RunPlanGenerationArgs,
    payloadBooks: Book[],
    messages: PlanMessages,
): Promise<
    Awaited<ReturnType<RunPlanGenerationArgs["plannerApi"]["generate"]>>
> {
    if (runIsCurrent(args)) {
        args.setStatus(messages.statusGeneratingMessage, false, "loading");
    }
    const PAYLOAD = buildPlanPayload(args.collectSettings(), payloadBooks);
    return args.plannerApi.generate(PAYLOAD);
}

function planSuccessArgs(
    args: RunPlanGenerationArgs,
    data: Awaited<ReturnType<RunPlanGenerationArgs["plannerApi"]["generate"]>>,
    messages: PlanMessages,
): PlanSuccessArgs {
    return {
        addLog: args.addLog,
        announce: args.announce,
        data,
        onSuccess: args.onSuccess,
        setStatus: args.setStatus,
        statusSuccessMessage: messages.statusSuccessMessage,
        successAnnouncement: messages.successAnnouncement,
    };
}

async function runPlanGenerationAttempt(
    args: RunPlanGenerationArgs,
): Promise<void> {
    const PAYLOAD_BOOKS = args.collectBooks();
    const MESSAGES = resolvedPlanMessages(args);
    logPlanGenerationStarted(PAYLOAD_BOOKS);
    if (!PAYLOAD_BOOKS.length) {
        await handleNoSchedulableBooks(args);
        return;
    }
    const DATA = await requestGeneratedPlan(args, PAYLOAD_BOOKS, MESSAGES);
    if (!runIsCurrent(args)) {
        return;
    }
    await handlePlanSuccess(planSuccessArgs(args, DATA, MESSAGES));
}

function shouldIgnorePlanFailure(
    args: RunPlanGenerationArgs,
    error: unknown,
): boolean {
    if (!runIsCurrent(args)) {
        return true;
    }
    return isPlannerSupersededError(error);
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
export async function runPlanGeneration(
    args: RunPlanGenerationArgs,
): Promise<void> {
    try {
        await runPlanGenerationAttempt(args);
    } catch (error) {
        if (shouldIgnorePlanFailure(args, error)) {
            return;
        }
        handlePlanFailure({
            addLog: args.addLog,
            announce: args.announce,
            error,
            setStatus: args.setStatus,
        });
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
function generatePayload({
    customStartDate,
    normalizedEndDate,
    payloadBooks,
    settings,
}: GeneratePayloadArgs): PlanGeneratePayload {
    const PAYLOAD_SETTINGS = payloadSettings(
        settings,
        customStartDate,
        normalizedEndDate,
    );
    const PAYLOAD: PlanGeneratePayload = {
        books: payloadBooks,
        settings: PAYLOAD_SETTINGS,
    };
    logPlannerPayload(PAYLOAD);
    return PAYLOAD;
}

function logPlannerPayload(payload: PlanGeneratePayload): void {
    logDebug("Submitting planner payload.", {
        bookCount: payload.books.length,
        endDate: payload.settings.end_date ?? null,
        solverProfile: payload.settings.planner_solver_profile ?? null,
        startDate: payload.settings.start_date,
    });
}

function payloadSettings(
    settings: PlannerSettings,
    customStartDate: string,
    normalizedEndDate: string | undefined,
): PlannerSettings {
    const PAYLOAD_SETTINGS = {
        ...settings,
        start_date: customStartDate,
    };
    if (normalizedEndDate !== undefined && normalizedEndDate !== "") {
        PAYLOAD_SETTINGS.end_date = normalizedEndDate;
    }
    return PAYLOAD_SETTINGS;
}
