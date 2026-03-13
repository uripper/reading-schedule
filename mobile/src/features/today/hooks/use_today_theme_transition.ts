import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import type { TodayBackgroundTheme } from "../today_background_theme.ts";
import { themeFromBook } from "../today_background_theme.ts";
import {
    COVER_SOURCES,
    THEME_TRANSITION_DURATION_MS,
} from "../today_constants.ts";
import type { TodayBookCard } from "../types.ts";

interface TodayThemeTransitionState {
    currentTheme: TodayBackgroundTheme;
    previousTheme: TodayBackgroundTheme;
    themeProgress: Animated.Value;
}

/**
 * Transitions between background themes when the active book changes.
 * @returns Current and previous themes plus animated transition progress.
 */
export function useTodayThemeTransition(
    books: TodayBookCard[],
    activeIndex: number,
): TodayThemeTransitionState {
    const ACTIVE_BOOK = books[activeIndex] ?? books[0] ?? null;
    const ACTIVE_BOOK_TITLE = ACTIVE_BOOK?.title ?? "";
    const ACTIVE_BOOK_HAS_COVER = hasCoverForBook(ACTIVE_BOOK_TITLE);
    const BACKGROUND_THEME = useMemo(() => {
        return themeFromBook(ACTIVE_BOOK_TITLE, ACTIVE_BOOK_HAS_COVER);
    }, [ACTIVE_BOOK_HAS_COVER, ACTIVE_BOOK_TITLE]);
    const [PREVIOUS_THEME, SET_PREVIOUS_THEME] = useState(BACKGROUND_THEME);
    const [CURRENT_THEME, SET_CURRENT_THEME] = useState(BACKGROUND_THEME);
    const PREVIOUS_THEME_REF = useRef(BACKGROUND_THEME);
    const TRANSITION_ID_REF = useRef(0);
    const THEME_PROGRESS = useRef(new Animated.Value(1)).current;

    useLayoutEffect(() => {
        const PREVIOUS = PREVIOUS_THEME_REF.current;
        const HAS_CHANGED =
            PREVIOUS.canvasColor !== BACKGROUND_THEME.canvasColor ||
            PREVIOUS.ambientColor !== BACKGROUND_THEME.ambientColor;
        if (!HAS_CHANGED) {
            return;
        }

        SET_PREVIOUS_THEME(PREVIOUS);
        SET_CURRENT_THEME(BACKGROUND_THEME);
        THEME_PROGRESS.stopAnimation();
        THEME_PROGRESS.setValue(0);
        const TRANSITION_ID = TRANSITION_ID_REF.current + 1;
        TRANSITION_ID_REF.current = TRANSITION_ID;
        Animated.timing(THEME_PROGRESS, {
            duration: THEME_TRANSITION_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) {
                return;
            }
            if (TRANSITION_ID_REF.current !== TRANSITION_ID) {
                return;
            }
            PREVIOUS_THEME_REF.current = BACKGROUND_THEME;
            SET_PREVIOUS_THEME(BACKGROUND_THEME);
            SET_CURRENT_THEME(BACKGROUND_THEME);
        });
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
