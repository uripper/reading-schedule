import type { TodayBookCard } from "@reading-schedule/contracts";
import type { RefObject } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import type { TodayBackgroundTheme } from "../today_background_theme.ts";
import { themeFromBook } from "../today_background_theme.ts";
import {
    COVER_SOURCES,
    THEME_TRANSITION_DURATION_MS,
} from "../today_constants.ts";

interface TodayThemeTransitionState {
    currentTheme: TodayBackgroundTheme;
    previousTheme: TodayBackgroundTheme;
    themeProgress: Animated.Value;
}

interface ThemeTransitionController {
    previousThemeRef: RefObject<TodayBackgroundTheme>;
    setCurrentTheme(theme: TodayBackgroundTheme): void;
    setPreviousTheme(theme: TodayBackgroundTheme): void;
    themeProgress: Animated.Value;
    transitionIdRef: RefObject<number>;
}

interface FinalizeTransitionArgs {
    controller: ThemeTransitionController;
    finished: boolean;
    nextTheme: TodayBackgroundTheme;
    transitionId: number;
}

function activeBookTitle(books: TodayBookCard[], activeIndex: number): string {
    return books[activeIndex]?.title ?? books[0]?.title ?? "";
}

function backgroundThemeForBook(
    books: TodayBookCard[],
    activeIndex: number,
): TodayBackgroundTheme {
    const ACTIVE_BOOK_TITLE = activeBookTitle(books, activeIndex);
    return themeFromBook(ACTIVE_BOOK_TITLE, hasCoverForBook(ACTIVE_BOOK_TITLE));
}

function hasThemeChanged(
    previousTheme: TodayBackgroundTheme,
    nextTheme: TodayBackgroundTheme,
): boolean {
    return (
        previousTheme.canvasColor !== nextTheme.canvasColor ||
        previousTheme.ambientColor !== nextTheme.ambientColor
    );
}

function setTransitionThemeState(
    controller: ThemeTransitionController,
    nextTheme: TodayBackgroundTheme,
): void {
    const PREVIOUS_THEME = controller.previousThemeRef.current;
    controller.setPreviousTheme(PREVIOUS_THEME);
    controller.setCurrentTheme(nextTheme);
    controller.themeProgress.stopAnimation();
    controller.themeProgress.setValue(0);
}

function finalizeTransition({
    controller,
    finished,
    nextTheme,
    transitionId,
}: FinalizeTransitionArgs): void {
    if (!finished) {
        return;
    }
    if (controller.transitionIdRef.current !== transitionId) {
        return;
    }
    const PREVIOUS_THEME_REF = controller.previousThemeRef;
    PREVIOUS_THEME_REF.current = nextTheme;
    controller.setPreviousTheme(nextTheme);
    controller.setCurrentTheme(nextTheme);
}

function startThemeTransition(
    controller: ThemeTransitionController,
    nextTheme: TodayBackgroundTheme,
): void {
    const TRANSITION_ID = controller.transitionIdRef.current + 1;
    const TRANSITION_ID_REF = controller.transitionIdRef;
    TRANSITION_ID_REF.current = TRANSITION_ID;
    Animated.timing(controller.themeProgress, {
        duration: THEME_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
    }).start(({ finished }) => {
        finalizeTransition({
            controller,
            finished,
            nextTheme,
            transitionId: TRANSITION_ID,
        });
    });
}

function syncThemeTransition(
    controller: ThemeTransitionController,
    nextTheme: TodayBackgroundTheme,
): void {
    if (!hasThemeChanged(controller.previousThemeRef.current, nextTheme)) {
        return;
    }
    setTransitionThemeState(controller, nextTheme);
    startThemeTransition(controller, nextTheme);
}

/**
 * Transitions between background themes when the active book changes.
 * @returns Current and previous themes plus animated transition progress.
 */
export function useTodayThemeTransition(
    books: TodayBookCard[],
    activeIndex: number,
): TodayThemeTransitionState {
    const BACKGROUND_THEME = useMemo(() => {
        return backgroundThemeForBook(books, activeIndex);
    }, [activeIndex, books]);
    const [PREVIOUS_THEME, SET_PREVIOUS_THEME] = useState(BACKGROUND_THEME);
    const [CURRENT_THEME, SET_CURRENT_THEME] = useState(BACKGROUND_THEME);
    const PREVIOUS_THEME_REF = useRef(BACKGROUND_THEME);
    const TRANSITION_ID_REF = useRef(0);
    const THEME_PROGRESS = useRef(new Animated.Value(1)).current;

    useLayoutEffect(() => {
        syncThemeTransition(
            {
                previousThemeRef: PREVIOUS_THEME_REF,
                setCurrentTheme: SET_CURRENT_THEME,
                setPreviousTheme: SET_PREVIOUS_THEME,
                themeProgress: THEME_PROGRESS,
                transitionIdRef: TRANSITION_ID_REF,
            },
            BACKGROUND_THEME,
        );
    }, [BACKGROUND_THEME, THEME_PROGRESS]);

    return {
        currentTheme: CURRENT_THEME,
        previousTheme: PREVIOUS_THEME,
        themeProgress: THEME_PROGRESS,
    };
}

function hasCoverForBook(title: string): boolean {
    return COVER_SOURCES[title] !== undefined;
}
