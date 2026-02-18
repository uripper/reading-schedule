import type { PlannerAdapter } from "@reading-schedule/contracts";

declare global {
  interface Window {
    plannerApi?: PlannerAdapter;
  }
}

export {};
