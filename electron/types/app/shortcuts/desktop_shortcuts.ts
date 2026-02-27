import type { PlannerApi } from "../../types.js";

export interface ShortcutBindings {
  announce(this: void, message: string, politeness?: "polite" | "assertive"): void;
  plannerApi: Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;
}
