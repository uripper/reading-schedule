import type { createAnnouncer } from "../../renderer/accessibility/index.js";
import type { createDashboardRuntime } from "../../renderer/app/dashboard_runtime.js";
import type { createInitRuntime } from "../../renderer/app/init/index.js";
import type { createRuntimeState } from "../../renderer/app/runtime_state.js";
import type { PlannerApi } from "../types.js";

export interface AppBootstrapContext {
  announce: ReturnType<typeof createAnnouncer>;
  announceForPlanController(message: string, politeness?: string): void;
  dashboards: ReturnType<typeof createDashboardRuntime>;
  plannerApi: PlannerApi;
  persistDraft(): Promise<boolean>;
  queuePersist(): void;
  runtime: ReturnType<typeof createInitRuntime>;
  setStatus(message: string, isError?: boolean): void;
  state: ReturnType<typeof createRuntimeState>;
}
