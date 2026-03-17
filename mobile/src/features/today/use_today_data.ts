import type { PlannerApi, TodayViewData } from "@reading-schedule/contracts";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { loadTodayViewData } from "./today-data-logic.ts";

interface TodayState {
    errorMessage: string | null;
    isLoading: boolean;
    viewData: TodayViewData;
}

const LOCAL_FALLBACK_VIEW_DATA: TodayViewData = {
    books: [
        {
            accent: "#9CD2EE",
            author: "William Shakespeare",
            completionPercent: 32,
            id: "fallback-hamlet",
            pagesDone: 55,
            pagesTotal: 170,
            title: "Hamlet",
        },
        {
            accent: "#F16865",
            author: "Miguel de Cervantes",
            completionPercent: 12,
            id: "fallback-don-quixote",
            pagesDone: 137,
            pagesTotal: 1100,
            title: "Don Quixote",
        },
        {
            accent: "#B5E080",
            author: "Jorge Luis Borges",
            completionPercent: 32,
            id: "fallback-ficciones",
            pagesDone: 55,
            pagesTotal: 170,
            title: "Ficciones",
        },
    ],
    stats: {
        completedSessions: "1/3",
        dayStreak: 7,
    },
};

const INITIAL_STATE: TodayState = {
    errorMessage: null,
    isLoading: false,
    viewData: LOCAL_FALLBACK_VIEW_DATA,
};

function fallbackTodayState(): TodayState {
    return {
        errorMessage: null,
        isLoading: false,
        viewData: LOCAL_FALLBACK_VIEW_DATA,
    };
}

function loadedTodayState(viewData: TodayViewData): TodayState {
    return {
        errorMessage: null,
        isLoading: false,
        viewData,
    };
}

function resetTodayError(previous: TodayState): TodayState {
    return {
        ...previous,
        errorMessage: null,
    };
}

function todayHookResult(state: TodayState, refresh: () => Promise<void>) {
    return {
        books: state.viewData.books,
        errorMessage: state.errorMessage,
        isLoading: state.isLoading,
        refresh,
        stats: state.viewData.stats,
    };
}

function useTodayRefresh(
    plannerApi: PlannerApi,
    setState: Dispatch<SetStateAction<TodayState>>,
) {
    return useCallback(async (): Promise<void> => {
        setState(resetTodayError);

        try {
            const VIEW_DATA = await loadTodayViewData(plannerApi);
            setState(loadedTodayState(VIEW_DATA));
        } catch {
            setState(fallbackTodayState());
        }
    }, [plannerApi, setState]);
}

export function useTodayData(plannerApi: PlannerApi) {
    const [STATE, SET_STATE] = useState<TodayState>(INITIAL_STATE);
    const REFRESH = useTodayRefresh(plannerApi, SET_STATE);

    useEffect(() => {
        REFRESH().catch(() => {
            SET_STATE(fallbackTodayState());
        });
    }, [REFRESH]);

    return todayHookResult(STATE, REFRESH);
}
