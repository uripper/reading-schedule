import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { CAROUSEL_GAP, MIN_CAROUSEL_SIDE_INSET } from "../today_constants";

/**
 * Calculates carousel metrics such as item width and side insets based on the screen width.
 * @returns An object containing the carousel item width and side inset.
 */
export function useCarouselMetrics() {
    const { width } = useWindowDimensions();
    const CARD_WIDTH = useMemo(() => {
        const BASE_CARD_WIDTH = 214;
        const EDGE_PADDING = 82;
        const CANDIDATE = width - EDGE_PADDING;
        if (CANDIDATE < BASE_CARD_WIDTH) {
            return BASE_CARD_WIDTH;
        }
        if (CANDIDATE > 294) {
            return 294;
        }
        return CANDIDATE;
    }, [width]);

    const ITEM_WIDTH = CARD_WIDTH + CAROUSEL_GAP;
    const CAROUSEL_SIDE_INSET = useMemo(() => {
        const RAW_INSET = (width - CARD_WIDTH) / 2;
        if (RAW_INSET < MIN_CAROUSEL_SIDE_INSET) {
            return MIN_CAROUSEL_SIDE_INSET;
        }
        return RAW_INSET;
    }, [CARD_WIDTH, width]);

    return {
        carouselSideInset: CAROUSEL_SIDE_INSET,
        itemWidth: ITEM_WIDTH,
    };
}
