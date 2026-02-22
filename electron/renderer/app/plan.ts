import type { Book } from "../books/types.js";
import type {
  PlanGeneratePayload,
  PlannerApi,
  PlannerResult,
  PlannerSettings,
  PlannerSummary,
} from "./types.js";

type RunPlanGenerationArgs = {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks: () => Book[];
  collectSettings: () => PlannerSettings;
  setStatus: (message: string, isError?: boolean) => void;
  addLog: (message: string) => void;
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  onSuccess: (
    data: Pick<PlannerResult, "schedule" | "summary">,
  ) => Promise<void>;
  statusGeneratingMessage?: string;
  statusSuccessMessage?: string;
  successAnnouncement?: string;
};

function dayKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowDayKey(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKeyFromDate(tomorrow);
}

function normalizeEndDate(
  endDate: unknown,
  startDate: string,
): string | undefined {
  if (typeof endDate !== "string" || !endDate) {
    return undefined;
  }
  if (endDate < startDate) {
    return startDate;
  }
  return endDate;
}

function summaryLog(summary: PlannerSummary | null): string {
  const status = summary?.status || "not-set";
  const planned = Number(summary?.total_planned_minutes || 0);
  const available = Number(summary?.total_available_minutes || 0);
  return `Status ${status}. Planned ${planned}/${available} minutes.`;
}

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

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const detail = trimmedStringOrEmpty(error.message);
    if (detail) {
      return detail;
    }
    return error.name || "Unknown error";
  }
  const detail = trimmedStringOrEmpty(error);
  if (detail) {
    return detail;
  }
  const messageDetail = messageFromErrorLikeObject(error);
  if (messageDetail) {
    return messageDetail;
  }
  return "Unknown planner error";
}

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
    if (normalizedEndDate) {
      payloadSettings.end_date = normalizedEndDate;
    }
    const payload: PlanGeneratePayload = {
      planner: "mip",
      books: payloadBooks,
      settings: payloadSettings,
    };

    const data = await plannerApi.generate(payload);
    await onSuccess(data);

    if (data.summary?.feasibility_warning) {
      addLog(data.summary.feasibility_warning);
    }
    addLog(summaryLog(data.summary));

    setStatus(statusSuccessMessage);
    if (successAnnouncement) {
      announce(successAnnouncement);
    }
  } catch (error) {
    const message = "Failed to generate plan";
    setStatus(message, true);
    addLog(`Plan generation error: ${errorMessage(error)}`);
    announce(message, "assertive");
  }
}
