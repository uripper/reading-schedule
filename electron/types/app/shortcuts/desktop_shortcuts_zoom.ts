import type { PlannerApi } from "../../types.js";

export type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;
