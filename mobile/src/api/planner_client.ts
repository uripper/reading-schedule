import {
    type BookLookupItem,
    type PlanGeneratePayload,
    type PlannerApi,
    type PlannerResult,
    type PlannerSaveResult,
    type PlannerStateLoadResult,
    type PlannerStateSnapshot,
    parsePlanGenerateResult,
    parseSamplePayload,
} from "@reading-schedule/contracts";

interface ErrorResponse {
    error?: string;
}

const REQUEST_TIMEOUT_MS = 2500;

function joinUrl(baseUrl: string, path: string): string {
    let normalizedBase = baseUrl;
    if (baseUrl.endsWith("/")) {
        normalizedBase = baseUrl.slice(0, -1);
    }
    return `${normalizedBase}${path}`;
}

async function decodeJson(response: Response): Promise<unknown> {
    if (!response.ok) {
        const JSON_RESPONSE = (await response
            .json()
            .catch(() => null)) as ErrorResponse | null;
        const MESSAGE = JSON_RESPONSE?.error;
        if (MESSAGE) {
            throw new Error(MESSAGE);
        }
        throw new Error(
            `Planner API request failed with status ${response.status}`,
        );
    }
    return response.json();
}

async function postJson(
    baseUrl: string,
    path: string,
    payload: unknown,
): Promise<unknown> {
    const CONTROLLER = new AbortController();
    const TIMEOUT_ID = setTimeout(() => {
        CONTROLLER.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
        const RESPONSE = await fetch(joinUrl(baseUrl, path), {
            body: JSON.stringify(payload),
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
            signal: CONTROLLER.signal,
        });
        return decodeJson(RESPONSE);
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Planner API request timed out.");
        }
        throw error;
    } finally {
        clearTimeout(TIMEOUT_ID);
    }
}

function notImplemented(name: string): Promise<never> {
    return Promise.reject(
        new Error(`${name} is not implemented for mobile yet`),
    );
}

/**
 * Creates a PlannerApi instance that communicates with the backend server
 * @param baseUrl - The base URL of the backend server
 * @returns An object that implements the PlannerApi interface, with methods
 * that make HTTP requests to the backend server.
 */
export function createMobilePlannerApi(baseUrl: string): PlannerApi {
    return {
        downloadCover(
            _url: string | undefined,
            _bookId: string | undefined,
        ): Promise<string> {
            return notImplemented("downloadCover");
        },
        async generate(
            payload: PlanGeneratePayload,
        ): Promise<Pick<PlannerResult, "schedule" | "summary">> {
            const RESULT = await postJson(
                baseUrl,
                "/api/plan/generate",
                payload,
            );
            return parsePlanGenerateResult(RESULT);
        },
        async loadState(): Promise<PlannerStateLoadResult> {
            const RESULT = await postJson(baseUrl, "/api/state/load", {});
            return RESULT as PlannerStateLoadResult;
        },
        async sample(): Promise<
            Pick<PlannerStateSnapshot, "settings" | "books">
        > {
            const RESULT = await postJson(baseUrl, "/api/state/sample", {});
            return parseSamplePayload(RESULT);
        },
        async saveState(
            state: PlannerStateSnapshot,
        ): Promise<PlannerSaveResult> {
            const RESULT = await postJson(baseUrl, "/api/state/save", state);
            return RESULT as PlannerSaveResult;
        },
        saveUploadedCover(
            _dataUrl: string | undefined,
            _bookId: string | undefined,
        ): Promise<string> {
            return notImplemented("saveUploadedCover");
        },
        async searchBooks(
            query: string,
            author = false,
        ): Promise<BookLookupItem[]> {
            const RESULT = await postJson(baseUrl, "/api/books/search", {
                author,
                query,
            });
            return RESULT as BookLookupItem[];
        },
        zoomIn(): Promise<number> {
            return notImplemented("zoomIn");
        },
        zoomOut(): Promise<number> {
            return notImplemented("zoomOut");
        },
        zoomReset(): Promise<number> {
            return notImplemented("zoomReset");
        },
    };
}
