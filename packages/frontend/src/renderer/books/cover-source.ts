import type { PlannerApiGlobal } from "../../types/types.ts";

function plannerApiFromGlobal() {
    const GLOBALS = globalThis as Partial<PlannerApiGlobal>;
    return GLOBALS.plannerApi;
}

/**
 * Resolves a cover image source through the current host bridge when present.
 * @param src - Candidate remote URL, file URL, or local file path.
 * @returns Host-safe source string for image rendering.
 */
export function resolveCoverSource(src: string | null | undefined): string {
    const NORMALIZED_SRC = String(src ?? "").trim();
    if (NORMALIZED_SRC.length === 0) {
        return "";
    }

    const PLANNER_API = plannerApiFromGlobal();
    if (PLANNER_API && typeof PLANNER_API.resolveCoverSrc === "function") {
        return PLANNER_API.resolveCoverSrc(NORMALIZED_SRC);
    }

    return NORMALIZED_SRC;
}
