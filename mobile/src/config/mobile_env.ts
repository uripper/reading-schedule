const DEFAULT_API_BASE_URL = "http://localhost:8787";

export function mobilePlannerApiBaseUrl(): string {
    const RAW_URL = process.env.EXPO_PUBLIC_PLANNER_API_BASE_URL;
    if (!RAW_URL) {
        return DEFAULT_API_BASE_URL;
    }
    const TRIMMED_URL = RAW_URL.trim();
    if (!TRIMMED_URL) {
        return DEFAULT_API_BASE_URL;
    }
    return TRIMMED_URL;
}
