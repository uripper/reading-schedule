import { TodayBackground } from "@features/today/today_background";
import { useMemo, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useCarouselMetrics } from "./hooks/use_carousel_metrics";
import { useTodayThemeTransition } from "./hooks/use_today_theme_transition";
import { themeFromBook } from "./today_background_theme";
import { CAROUSEL_GAP, COVER_SOURCES, DEFAULT_COVER_SOURCE } from "./today_constants"
import {
    HEADER_SHADOW_BLUE,
    HEADER_SHADOW_PURPLE,
    HEADER_TEXT,
    STAT_A,
    STAT_B,
    STYLES,
} from "./today_screen_styles";
import { TodayThemeTransitionLayer } from "./today_theme_transition_layer";
import type { TodayBookCard, TodayStats } from "./types";

interface CardProps {
    book: TodayBookCard;
    isActive: boolean;
    onPress(): void;
}

interface TodayScreenProps {
    books: TodayBookCard[];
    stats: TodayStats;
}

interface StatBubbleProps {
    fill: string;
    label: string;
    value: string;
}

function coverForBook(title: string): number {
    const SOURCE = COVER_SOURCES[title];
    if (SOURCE) {
        return SOURCE;
    }
    return DEFAULT_COVER_SOURCE;
}

function hasCoverForBook(title: string): boolean {
    return COVER_SOURCES[title] !== undefined;
}

function CarouselCard({ book, isActive, onPress }: CardProps) {
    let cardOpacity = 0.64;
    if (isActive) {
        cardOpacity = 1;
    }

    return (
        <Pressable
            onPress={onPress}
            style={[STYLES.card, { opacity: cardOpacity }]}
        >
            <View style={[STYLES.bookArt, { backgroundColor: book.accent }]}>
                <Image
                    source={coverForBook(book.title)}
                    style={STYLES.coverImage}
                />
            </View>
        </Pressable>
    );
}

function StatBubble({ fill, label, value }: StatBubbleProps) {
    return (
        <View style={[STYLES.statBubble, { backgroundColor: fill }]}>
            <Text style={STYLES.statValue}>{value}</Text>
            <Text style={STYLES.statLabel}>{label}</Text>
        </View>
    );
}

/**
 * Renders the mobile Today screen with active-book carousel, progress, and stats.
 * @param books - Ordered list of book cards available in the carousel.
 * @param stats - Summary statistics rendered below the session controls.
 * @returns Full Today screen scroll view for the current reading state.
 */
export function TodayScreen({ books, stats }: TodayScreenProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeBook = books[activeIndex] ?? books[0] ?? null;
    const activeBookTitle = activeBook?.title ?? "";
    const activeBookHasCover = hasCoverForBook(activeBookTitle);
    const backgroundTheme = useMemo(() => {
        return themeFromBook(activeBookTitle, activeBookHasCover);
    }, [activeBookHasCover, activeBookTitle]);
    const [previousTheme, ] = useState(backgroundTheme);
    const [currentTheme, ] = useState(backgroundTheme);
    const themeProgress = useRef(new Animated.Value(1)).current;

    useTodayThemeTransition(books, activeIndex);

    const { itemWidth, carouselSideInset } = useCarouselMetrics();

    if (!activeBook) {
        return null;
    }
    const syncActiveIndex = (
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ): void => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / itemWidth);
        if (index < 0 || index >= books.length) {
            return;
        }
        setActiveIndex(index);
    }

    return renderTodayScreen(
        currentTheme,
        previousTheme,
        themeProgress,
        carouselSideInset,
        books,
        syncActiveIndex,
        itemWidth,
        activeIndex,
        setActiveIndex,
        activeBook,
        stats,
    );
}
function renderTodayScreen(
    currentTheme: TodayBackgroundTheme,
    previousTheme: TodayBackgroundTheme,
    themeProgress: Animated.Value,
    carouselSideInset: number,
    books: TodayBookCard[],
    syncActiveIndex: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
    itemWidth: number,
    activeIndex: number,
    setActiveIndex,
    activeBook: TodayBookCard,
    stats: TodayStats,
) {
    return (
        <ScrollView
            bounces={false}
            contentContainerStyle={[
                STYLES.content,
                { backgroundColor: currentTheme.canvasColor },
            ]}
        >
            <TodayThemeTransitionLayer
                fromColor={previousTheme.canvasColor}
                progress={themeProgress}
                toColor={currentTheme.canvasColor}
            />
            <TodayBackground ambientColor={currentTheme.ambientColor} />

            <View style={STYLES.hero}>
                <Text
                    style={[STYLES.todayShadow, { color: HEADER_SHADOW_BLUE }]}
                >
                    TODAY
                </Text>
                <Text
                    style={[
                        STYLES.todayShadowMid,
                        { color: HEADER_SHADOW_PURPLE },
                    ]}
                >
                    TODAY
                </Text>
                <Text style={[STYLES.todayTitle, { color: HEADER_TEXT }]}>
                    TODAY
                </Text>
            </View>

            <FlatList
                contentContainerStyle={[
                    STYLES.carouselRow,
                    { paddingHorizontal: carouselSideInset },
                ]}
                data={books}
                decelerationRate="fast"
                horizontal
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => {
                    return <View style={{ width: CAROUSEL_GAP }} />;
                }}
                onMomentumScrollEnd={syncActiveIndex}
                renderItem={({ item, index }) => {
                    return (
                        <View style={{ width: itemWidth }}>
                            <CarouselCard
                                book={item}
                                isActive={index === activeIndex}
                                onPress={() => {
                                    setActiveIndex(index);
                                }}
                            />
                        </View>
                    );
                }}
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={itemWidth}
                style={STYLES.carouselList}
            />

            <Text style={STYLES.currentBook}>
                {activeBook.title.toUpperCase()} |{" "}
                {activeBook.author.toUpperCase()}
            </Text>

            <View style={STYLES.progressPill}>
                <Text style={STYLES.progressText}>
                    {activeBook.completionPercent}% | {activeBook.pagesDone}/
                    {activeBook.pagesTotal}
                </Text>
            </View>

            <Pressable style={STYLES.sessionButton}>
                <Text style={STYLES.sessionButtonLabel}>Log Session</Text>
            </Pressable>

            <View style={STYLES.statsRow}>
                <View style={STYLES.statConnectorVertical} />
                <View style={STYLES.statConnectorHorizontal} />
                <View style={STYLES.statConnectorDot} />
                <StatBubble
                    fill={STAT_A}
                    label="Day Streak"
                    value={String(stats.dayStreak)}
                />
                <StatBubble
                    fill={STAT_B}
                    label="Complete Sessions"
                    value={stats.completedSessions}
                />
            </View>
        </ScrollView>
    );
}
