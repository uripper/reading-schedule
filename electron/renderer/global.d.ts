
import type { PlannerApi } from './app/types.js';

declare global {
  interface Window {
    plannerApi: PlannerApi;
  }

  const plannerApi: PlannerApi;
}

export {};
