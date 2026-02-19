import type { Book } from '../books/types.js';
import type { PlanGeneratePayload, PlannerApi, PlannerResult, PlannerSettings, PlannerSummary } from './types.js';

type RunPlanGenerationArgs = {
  plannerApi: Pick<PlannerApi, 'generate'>;
  collectBooks: () => Book[];
  collectSettings: () => PlannerSettings;
  setStatus: (message: string, isError?: boolean) => void;
  addLog: (message: string) => void;
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
  onSuccess: (data: Pick<PlannerResult, 'schedule' | 'summary'>) => Promise<void>;
  statusGeneratingMessage?: string;
  statusSuccessMessage?: string;
  successAnnouncement?: string;
};

function summaryLog(summary: PlannerSummary | null): string {
  const status = summary?.status || 'not-set';
  const planned = Number(summary?.total_planned_minutes || 0);
  const available = Number(summary?.total_available_minutes || 0);
  return `Status ${status}. Planned ${planned}/${available} minutes.`;
}

export async function runPlanGeneration({
  plannerApi,
  collectBooks,
  collectSettings,
  setStatus,
  addLog,
  announce,
  onSuccess,
  statusGeneratingMessage = 'Generating plan...',
  statusSuccessMessage = 'Plan generated.',
  successAnnouncement = 'Plan generated and schedule updated.',
}: RunPlanGenerationArgs): Promise<void> {
  try {
    const payloadBooks = collectBooks();
    if (!payloadBooks.length) {
      return;
    }

    setStatus(statusGeneratingMessage);
    const payload: PlanGeneratePayload = {
      planner: 'mip',
      books: payloadBooks,
      settings: collectSettings(),
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
  } catch {
    const message = 'Failed to generate plan';
    setStatus(message, true);
    announce(message, 'assertive');
  }
}
