import type { PlannerAdapter } from "@reading-schedule/contracts";

function plannerApiFromGlobalScope(): PlannerAdapter | null {
  const scope = globalThis as typeof globalThis & { plannerApi?: PlannerAdapter };
  return scope.plannerApi || null;
}

function requireDesktopApi(): PlannerAdapter {
  const plannerApi = plannerApiFromGlobalScope();
  if (!plannerApi) {
    throw new Error("Desktop planner API bridge not found.");
  }
  return plannerApi;
}

export const desktopAdapter: PlannerAdapter = {
  async generatePlan(payload) {
    return requireDesktopApi().generatePlan(payload);
  },
  async loadState() {
    return requireDesktopApi().loadState();
  },
  async saveState(state) {
    return requireDesktopApi().saveState(state);
  },
  async searchBooks(query) {
    return requireDesktopApi().searchBooks(query);
  },
  async downloadCover(url, bookId) {
    return requireDesktopApi().downloadCover(url, bookId);
  },
};
