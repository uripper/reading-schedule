const DEFAULT_API_BASE_URL = "http://localhost:8787";

interface ProcessLike {
    env?: Record<string, string | undefined>;
}

function envValue(name: string): string | undefined {
    const PROCESS_LIKE = (globalThis as { process?: ProcessLike }).process;
    return PROCESS_LIKE?.env?.[name];
}

export function mobilePlannerApiBaseUrl(): string {
    const RAW_URL = envValue("EXPO_PUBLIC_PLANNER_API_BASE_URL");
    if (!RAW_URL) {
        return DEFAULT_API_BASE_URL;
    }
    const TRIMMED_URL = RAW_URL.trim();
    if (!TRIMMED_URL) {
        return DEFAULT_API_BASE_URL;
    }
    return TRIMMED_URL;
}
