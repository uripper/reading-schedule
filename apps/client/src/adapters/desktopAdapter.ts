import type { PlannerAdapter } from "@reading-schedule/contracts";

function requireDesktopApi(): PlannerAdapter {
  if (!window.plannerApi) {
    throw new Error("Desktop planner API bridge not found.");
  }
  return window.plannerApi;
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
