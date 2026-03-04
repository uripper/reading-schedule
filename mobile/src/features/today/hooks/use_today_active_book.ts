import { useCallback, useState } from "react";
import type {
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native";
import type { TodayBookCard } from "../types";

interface UseTodayActiveBookResult {
    activeBook: TodayBookCard | null;
    activeIndex: number;
    setActiveIndex(index: number): void;
    syncActiveIndex(event: NativeSyntheticEvent<NativeScrollEvent>): void;
}

/**
 * Manages active book selection and keeps the index in sync with carousel scroll.
 * @param books - Ordered book cards displayed in the carousel.
 * @param itemWidth - Width used to compute the snap index from horizontal offset.
 * @returns Active book state and handlers for press and scroll interactions.
 */
export function useTodayActiveBook(
    books: TodayBookCard[],
    itemWidth: number,
): UseTodayActiveBookResult {
    const [ACTIVE_INDEX, SET_ACTIVE_INDEX] = useState(0);
    const ACTIVE_BOOK = books[ACTIVE_INDEX] ?? books[0] ?? null;

    const SET_ACTIVE_INDEX_SAFE = useCallback((index: number): void => {
        if (index < 0 || index >= books.length) {
            return;
        }
        SET_ACTIVE_INDEX(index);
    }, [books.length]);

    const SYNC_ACTIVE_INDEX = useCallback((
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ): void => {
        const OFFSET_X = event.nativeEvent.contentOffset.x;
        const INDEX = Math.round(OFFSET_X / itemWidth);
        SET_ACTIVE_INDEX_SAFE(INDEX);
    }, [itemWidth, SET_ACTIVE_INDEX_SAFE]);

    return {
        activeBook: ACTIVE_BOOK,
        activeIndex: ACTIVE_INDEX,
        setActiveIndex: SET_ACTIVE_INDEX_SAFE,
        syncActiveIndex: SYNC_ACTIVE_INDEX,
    };
}
