import type { PlannerAdapter } from "@reading-schedule/contracts";
import { desktopAdapter } from "./desktopAdapter";
import { httpAdapter } from "./httpAdapter";

export function getDefaultAdapter(): PlannerAdapter {
  if (window.plannerApi) return desktopAdapter;
  return httpAdapter;
}
