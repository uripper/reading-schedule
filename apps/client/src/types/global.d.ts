import type { PlannerAdapter } from "@reading-schedule/contracts";

declare global {
  var plannerApi: PlannerAdapter | undefined;

  interface Window {
    plannerApi?: PlannerAdapter;
  }
}

export {};
