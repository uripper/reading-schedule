import type { StatusPhase } from "../../types/types.ts";
import type { ScheduleStatusOverlay } from "./schedule-status-overlay.ts";

export function statusColor(isError: boolean): string {
    if (isError) {
        return "var(--app-danger)";
    }
    return "var(--app-textMuted)";
}

export function applyStatusPhase(
    overlay: ScheduleStatusOverlay,
    phase: StatusPhase | undefined,
): void {
    if (phase === "loading") {
        overlay.showUpdating();
        return;
    }
    if (phase === "success") {
        overlay.showUpdated();
        return;
    }
    if (phase === "error") {
        overlay.showFailed();
    }
}
