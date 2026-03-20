import type { TodayBookCard } from "@reading-schedule/contracts";
import { useCallback, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

interface UseTodayActiveBookResult {
    activeBook: TodayBookCard | null;
    activeIndex: number;
    setActiveIndex(index: number): void;
    syncActiveIndex(event: NativeSyntheticEvent<NativeScrollEvent>): void;
}

function activeBookAtIndex(
    books: TodayBookCard[],
    activeIndex: number,
): TodayBookCard | null {
    return books[activeIndex] ?? books[0] ?? null;
}

function activeIndexFromScrollOffset(
    itemWidth: number,
    event: NativeSyntheticEvent<NativeScrollEvent>,
): number {
    const OFFSET_X = event.nativeEvent.contentOffset.x;
    return Math.round(OFFSET_X / itemWidth);
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
    const ACTIVE_BOOK = activeBookAtIndex(books, ACTIVE_INDEX);

    const SET_ACTIVE_INDEX_SAFE = useCallback(
        (index: number): void => {
            if (index < 0 || index >= books.length) {
                return;
            }
            SET_ACTIVE_INDEX(index);
        },
        [books.length],
    );

    const SYNC_ACTIVE_INDEX = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
            const INDEX = activeIndexFromScrollOffset(itemWidth, event);
            SET_ACTIVE_INDEX_SAFE(INDEX);
        },
        [itemWidth, SET_ACTIVE_INDEX_SAFE],
    );

    return {
        activeBook: ACTIVE_BOOK,
        activeIndex: ACTIVE_INDEX,
        setActiveIndex: SET_ACTIVE_INDEX_SAFE,
        syncActiveIndex: SYNC_ACTIVE_INDEX,
    };
}
