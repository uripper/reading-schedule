import type { AppRuntimeState } from "./runtime_state.js";

type AutoPlanController = {
  queueAutoPlan: () => void;
};

type InitRuntimeArgs = {
  focusCalendarToday: () => void;
  queuePersist: () => void;
  state: AppRuntimeState;
  updateDashboards: () => void;
};

export function createInitRuntime({
  focusCalendarToday,
  queuePersist,
  state,
  updateDashboards,
}: InitRuntimeArgs): {
  handleBooksChanged: () => void;
  handleScheduleMutation: () => void;
  handleTabChange: (name: string) => void;
  queueAutoPlanIfReady: () => void;
  setPlanController: (controller: AutoPlanController | null) => void;
} {
  let planController: AutoPlanController | null = null;
  const queueAutoPlanIfReady = () => {
    if (state.ready && planController) {
      planController.queueAutoPlan();
    }
  };
  const handleTabChange = (name: string) => {
    if (name === "schedule") {
      focusCalendarToday();
    }
  };
  const handleBooksChanged = () => {
    updateDashboards();
    queuePersist();
    queueAutoPlanIfReady();
  };
  const handleScheduleMutation = () => {
    updateDashboards();
    queueAutoPlanIfReady();
  };
  return {
    handleBooksChanged,
    handleScheduleMutation,
    handleTabChange,
    queueAutoPlanIfReady,
    setPlanController: (controller) => {
      planController = controller;
    },
  };
}
