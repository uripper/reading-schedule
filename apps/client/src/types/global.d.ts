import type { PlannerAdapter } from "@reading-schedule/contracts";

declare global {
  const plannerApi: PlannerAdapter | undefined;

  interface Window {
    plannerApi?: PlannerAdapter;
  }
}

export {};
