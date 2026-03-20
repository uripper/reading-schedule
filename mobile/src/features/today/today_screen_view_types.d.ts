import type { TodayBookCard, TodayStats } from "@reading-schedule/contracts";
import type { ComponentProps } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { TodayBackgroundTheme } from "./today_background_theme";
import { TodayThemeTransitionLayer } from "./today_theme_transition_layer.tsx";

/** Props for a single carousel card. */
export interface CardProps {
    book: TodayBookCard;
    isActive: boolean;
    onPress(): void;
}

/** Props for the full Today screen. */
export interface TodayScreenProps {
    books: TodayBookCard[];
    stats: TodayStats;
}

/** Props for a stats bubble. */
export interface StatBubbleProps {
    fill: string;
    label: string;
    value: string;
}

/** Props for the Today hero area. */
export interface TodayHeroProps {
    ambientColor: string;
    currentThemeCanvasColor: string;
    previousThemeCanvasColor: string;
    themeProgress: ComponentProps<typeof TodayThemeTransitionLayer>["progress"];
}

/** Props for the book carousel. */
export interface TodayCarouselProps {
    activeIndex: number;
    books: TodayBookCard[];
    cardWidth: number;
    carouselSideInset: number;
    itemWidth: number;
    onCardPress(index: number): void;
    onMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void;
}

/** Props for the active-book progress section. */
export interface TodayBookProgressProps {
    activeBook: TodayBookCard | null;
}

/** Props for the stats section. */
export interface TodayStatsSectionProps {
    stats: TodayStats;
}

/** Props for a carousel item wrapper. */
export interface TodayCarouselItemProps {
    activeIndex: number;
    book: TodayBookCard;
    cardWidth: number;
    index: number;
    onCardPress(index: number): void;
}

/**
 * Domain-level theme type for the Today screen.
 *
 * This is intentionally an alias of {@link TodayBackgroundTheme} so that the
 * Today screen state and view types can depend on a stable "TodayTheme"
 * concept, decoupled from the specific background/theme implementation.
 * If the underlying theme implementation changes in the future, this alias
 * can be updated without touching all Today screen consumers.
 */
export type TodayTheme = TodayBackgroundTheme;

/** Local state consumed by the Today screen renderer. */
export interface TodayScreenState {
    activeBook: TodayBookCard | null;
    activeIndex: number;
    cardWidth: number;
    carouselSideInset: number;
    currentTheme: TodayTheme;
    itemWidth: number;
    onCardPress(index: number): void;
    previousTheme: TodayTheme;
    syncActiveIndex: TodayCarouselProps["onMomentumScrollEnd"];
    themeProgress: ComponentProps<typeof TodayThemeTransitionLayer>["progress"];
}

/** Props for the assembled Today screen content view. */
export interface TodayScreenContentProps extends TodayScreenState {
    books: TodayBookCard[];
    stats: TodayStats;
}
