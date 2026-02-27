
import type { PlanGeneratePayload, PlannerSummary } from "../../types/types.js";
import type { RunPlanGenerationArgs } from "../../types/app_plan.js";

/**
 * Generates a day key in the format "YYYY-MM-DD" from a Date object.
 * @param date The Date object to convert.
 * @returns A string representing the day key in "YYYY-MM-DD" format.
 */
function dayKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generates a day key for tomorrow's date in the format "YYYY-MM-DD".
 * @returns A string representing tomorrow's day key in "YYYY-MM-DD" format.
 */
function tomorrowDayKey(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKeyFromDate(tomorrow);
}

/**
 * Normalizes the end date by ensuring it is a valid string and not before the start date.
 * @param endDate The end date to normalize.
 * @param startDate The start date to compare against.
 * @returns A normalized end date string or undefined if the input is invalid.
 */
function normalizeEndDate(
  endDate: unknown,
  startDate: string,
): string | undefined {
  if (typeof endDate !== "string" || !endDate) {
    return undefined;
  }
  const normalizedEndDate = endDate.trim();
  if (normalizedEndDate === "") {
    return undefined;
  }
  if (normalizedEndDate < startDate) {
    return startDate;
  }
  return normalizedEndDate;
}

/**
 * Generates a summary log message based on the planner summary data.
 * @param summary The planner summary data to generate the log message from.
 * @returns A string containing the status and planned/available minutes.
 */
function summaryLog(summary: PlannerSummary | null): string {
  const status = summary?.status ?? "not-set";
  const planned = Number(summary?.total_planned_minutes ?? 0);
  const available = Number(summary?.total_available_minutes ?? 0);
  return `Status ${status}. Planned ${planned}/${available} minutes.`;
}

/**
 * Logs planner summary details and optional feasibility warning.
 * @param summary Planner summary payload from the generated plan.
 * @param addLog Log sink used for planner status output.
 */
function logPlanSummary(
  summary: PlannerSummary | null | undefined,
  addLog: (message: string) => void,
): void {
  const feasibilityWarning = summary?.feasibility_warning;
  if (typeof feasibilityWarning === "string" && feasibilityWarning !== "") {
    addLog(feasibilityWarning);
  }
  addLog(summaryLog(summary ?? null));
}

/**
 * Trims a string value or returns an empty string if the input is not a valid string.
 * @param value The value to trim or validate.
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
 * @param error The error-like object to extract the message from.
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
 * @param error The unknown error object to extract the message from.
 * @returns A user-friendly error message string.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const detail = trimmedStringOrEmpty(error.message);
    if (detail) {
      return detail;
    }
    return error.name || "Unknown error";
  }
  const stringDetail = trimmedStringOrEmpty(error);
  if (stringDetail) {
    return stringDetail;
  }
  const messageDetail = messageFromErrorLikeObject(error);
  if (messageDetail) {
    return messageDetail;
  }
  return "Unknown planner error";
}

/**
 * Runs the plan generation process by collecting necessary data, calling the planner API,
 * and handling the results.
 * @param root0 An object containing the necessary functions and parameters for running the plan generation.
 * @param root0.plannerApi An object with a "generate" method to call the planner API.
 * @param root0.collectBooks A function that collects and returns an array of books to be planned.
 * @param root0.collectSettings A function that collects and returns the planner settings.
 * @param root0.setStatus A function to update the status message in the UI, with an optional error flag.
 * @param root0.addLog A function to add a log message to the UI.
 * @param root0.announce A function to announce a message to the user, with an optional politeness level.
 * @param root0.onSuccess A function that is called with the planner result data when the plan generation is successful.
 * @param root0.statusGeneratingMessage An optional custom message to display while the plan is being generated.
 * Defaults to "Generating plan...".
 * @param root0.statusSuccessMessage An optional custom message to display when the plan generation is successful.
 * Defaults to "Plan generated.".
 * @param root0.successAnnouncement An optional custom message to announce when the plan generation is successful.
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
    const payloadBooks = collectBooks();
    if (!payloadBooks.length) {
      await onSuccess({ schedule: [], summary: null });
      setStatus("No schedulable books to plan.");
      return;
    }

    setStatus(statusGeneratingMessage);
    const settings = collectSettings();
    const forcedStartDate = tomorrowDayKey();
    const normalizedEndDate = normalizeEndDate(
      settings.end_date,
      forcedStartDate,
    );
    const payloadSettings = {
      ...settings,
      start_date: forcedStartDate,
    };
    if (normalizedEndDate !== undefined && normalizedEndDate !== "") {
      payloadSettings.end_date = normalizedEndDate;
    }
    const payload: PlanGeneratePayload = {
      planner: "mip",
      books: payloadBooks,
      settings: payloadSettings,
    };

    const data = await plannerApi.generate(payload);
    await onSuccess(data);
    logPlanSummary(data.summary, addLog);

    setStatus(statusSuccessMessage);
    if (successAnnouncement !== "") {
      announce(successAnnouncement);
    }
  } catch (error) {
    const message = "Failed to generate plan";
    setStatus(message, true);
    addLog(`Plan generation error: ${errorMessage(error)}`);
    announce(message, "assertive");
  }
}
