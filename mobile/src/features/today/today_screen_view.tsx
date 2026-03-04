import { TodayBackground } from "@features/today/today_background";
import type { ComponentProps } from "react";
import {
    FlatList,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useCarouselMetrics } from "./hooks/use_carousel_metrics";
import { useTodayActiveBook } from "./hooks/use_today_active_book";
import { useTodayThemeTransition } from "./hooks/use_today_theme_transition";
import {
    CAROUSEL_GAP,
    COVER_SOURCES,
    DEFAULT_COVER_SOURCE,
} from "./today_constants";
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

interface TodayHeroProps {
    currentThemeCanvasColor: string;
    previousThemeCanvasColor: string;
    ambientColor: string;
    themeProgress: ComponentProps<typeof TodayThemeTransitionLayer>["progress"];
}

interface TodayCarouselProps {
    activeIndex: number;
    books: TodayBookCard[];
    cardWidth: number;
    carouselSideInset: number;
    itemWidth: number;
    onCardPress(index: number): void;
    onMomentumScrollEnd: ReturnType<
        typeof useTodayActiveBook
    >["syncActiveIndex"];
}

interface TodayBookProgressProps {
    activeBook: TodayBookCard;
}

interface TodayStatsSectionProps {
    stats: TodayStats;
}

function TodayHero({
    ambientColor,
    currentThemeCanvasColor,
    previousThemeCanvasColor,
    themeProgress,
}: TodayHeroProps) {
    return (
        <>
            <TodayThemeTransitionLayer
                fromColor={previousThemeCanvasColor}
                progress={themeProgress}
                toColor={currentThemeCanvasColor}
            />
            <TodayBackground ambientColor={ambientColor} />
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
        </>
    );
}

function TodayCarousel({
    activeIndex,
    books,
    cardWidth,
    carouselSideInset,
    itemWidth,
    onCardPress,
    onMomentumScrollEnd,
}: TodayCarouselProps) {
    return (
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
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item, index }) => {
                return (
                    <View style={{ width: cardWidth }}>
                        <CarouselCard
                            book={item}
                            isActive={index === activeIndex}
                            onPress={() => {
                                onCardPress(index);
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
    );
}

function TodayBookProgress({ activeBook }: TodayBookProgressProps) {
    return (
        <>
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
        </>
    );
}

function TodayStatsSection({ stats }: TodayStatsSectionProps) {
    return (
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
    );
}

/**
 * Renders the mobile Today screen with active-book carousel, progress, and stats.
 * @param books - Ordered list of book cards available in the carousel.
 * @param stats - Summary statistics rendered below the session controls.
 * @returns Full Today screen scroll view for the current reading state.
 */
export function TodayScreen({ books, stats }: TodayScreenProps) {
    const { cardWidth, itemWidth, carouselSideInset } = useCarouselMetrics();
    const { activeBook, activeIndex, setActiveIndex, syncActiveIndex } =
        useTodayActiveBook(books, itemWidth);
    const { currentTheme, previousTheme, themeProgress } =
        useTodayThemeTransition(books, activeIndex);

    if (!activeBook) {
        return null;
    }

    return (
        <ScrollView
            bounces={false}
            contentContainerStyle={[
                STYLES.content,
                { backgroundColor: currentTheme.canvasColor },
            ]}
        >
            <TodayHero
                ambientColor={currentTheme.ambientColor}
                currentThemeCanvasColor={currentTheme.canvasColor}
                previousThemeCanvasColor={previousTheme.canvasColor}
                themeProgress={themeProgress}
            />
            <TodayCarousel
                activeIndex={activeIndex}
                books={books}
                cardWidth={cardWidth}
                carouselSideInset={carouselSideInset}
                itemWidth={itemWidth}
                onCardPress={setActiveIndex}
                onMomentumScrollEnd={syncActiveIndex}
            />
            <TodayBookProgress activeBook={activeBook} />
            <TodayStatsSection stats={stats} />
        </ScrollView>
    );
}
