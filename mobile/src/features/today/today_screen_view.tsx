import type { TodayBookCard } from "@reading-schedule/contracts";
import {
    FlatList,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { useCarouselMetrics } from "./hooks/use_carousel_metrics.ts";
import { useTodayActiveBook } from "./hooks/use_today_active_book.ts";
import { useTodayThemeTransition } from "./hooks/use_today_theme_transition.ts";
import { TodayBackground } from "./today_background.tsx";
import {
    CAROUSEL_GAP,
    COVER_SOURCES,
    DEFAULT_COVER_SOURCE,
} from "./today_constants.ts";
import {
    HEADER_SHADOW_BLUE,
    HEADER_SHADOW_PURPLE,
    HEADER_TEXT,
    STAT_A,
    STAT_B,
    STYLES,
} from "./today_screen_styles.ts";
import type {
    CardProps,
    StatBubbleProps,
    TodayBookProgressProps,
    TodayCarouselItemProps,
    TodayCarouselProps,
    TodayHeroProps,
    TodayScreenContentProps,
    TodayScreenProps,
    TodayScreenState,
    TodayStatsSectionProps,
} from "./today_screen_view_types";
import { TodayThemeTransitionLayer } from "./today_theme_transition_layer.tsx";

/** Render the mobile Today screen chrome around the active reading state. */

function coverForBook(title: string): number {
    const SOURCE = COVER_SOURCES[title];
    if (SOURCE) {
        return SOURCE;
    }
    return DEFAULT_COVER_SOURCE;
}

/** Render a single carousel card with cover art and active-state styling. */
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

/** Render one filled statistics bubble. */
function StatBubble({ fill, label, value }: StatBubbleProps) {
    return (
        <View style={[STYLES.statBubble, { backgroundColor: fill }]}>
            <Text style={STYLES.statValue}>{value}</Text>
            <Text style={STYLES.statLabel}>{label}</Text>
        </View>
    );
}

const CAROUSEL_SPACER_STYLE = { width: CAROUSEL_GAP } as const;

/** Render the Today hero artwork, title, and theme transition layer. */
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

/** Render the fixed gap between carousel items. */
function CarouselSpacer() {
    return <View style={CAROUSEL_SPACER_STYLE} />;
}

/** Wrap a carousel card in the width used by the snapping list. */
function TodayCarouselItem({
    activeIndex,
    book,
    cardWidth,
    index,
    onCardPress,
}: TodayCarouselItemProps) {
    return (
        <View style={{ width: cardWidth }}>
            <CarouselCard
                book={book}
                isActive={index === activeIndex}
                onPress={() => {
                    onCardPress(index);
                }}
            />
        </View>
    );
}

/** Build the carousel content container style for the current inset. */
function carouselContentStyle(carouselSideInset: number) {
    return [STYLES.carouselRow, { paddingHorizontal: carouselSideInset }];
}

/** Build the main scroll container style for the active canvas color. */
function contentStyle(canvasColor: string) {
    return [STYLES.content, { backgroundColor: canvasColor }];
}

/** Create the FlatList render callback for carousel items. */
function carouselRenderItem(props: TodayCarouselProps) {
    return ({ item, index }: { index: number; item: TodayBookCard }) => (
        <TodayCarouselItem
            activeIndex={props.activeIndex}
            book={item}
            cardWidth={props.cardWidth}
            index={index}
            onCardPress={props.onCardPress}
        />
    );
}

/** Collect the shared FlatList props used by the book carousel. */
function createTodayCarouselListProps(props: TodayCarouselProps) {
    return {
        contentContainerStyle: carouselContentStyle(props.carouselSideInset),
        data: props.books,
        decelerationRate: "fast" as const,
        horizontal: true,
        ItemSeparatorComponent: CarouselSpacer,
        keyExtractor: (item: TodayBookCard) => item.id,
        onMomentumScrollEnd: props.onMomentumScrollEnd,
        renderItem: carouselRenderItem(props),
        showsHorizontalScrollIndicator: false,
        snapToAlignment: "start" as const,
        snapToInterval: props.itemWidth,
        style: STYLES.carouselList,
    };
}

/** Render the horizontally scrolling carousel of Today book cards. */
function TodayCarousel(props: TodayCarouselProps) {
    const TODAY_CAROUSEL_PROPS = createTodayCarouselListProps(props);
    return <FlatList {...TODAY_CAROUSEL_PROPS} />;
}

/** Render progress details and session controls for the active book. */
function TodayBookProgress({ activeBook }: TodayBookProgressProps) {
    if (!activeBook) {
        return null;
    }
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

/** Render the statistics row beneath the carousel and progress block. */
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

/** Assemble the full Today screen once carousel state has been derived. */
function TodayScreenContent(props: TodayScreenContentProps) {
    return (
        <ScrollView
            bounces={false}
            contentContainerStyle={contentStyle(props.currentTheme.canvasColor)}
        >
            <TodayHero
                ambientColor={props.currentTheme.ambientColor}
                currentThemeCanvasColor={props.currentTheme.canvasColor}
                previousThemeCanvasColor={props.previousTheme.canvasColor}
                themeProgress={props.themeProgress}
            />
            <TodayCarousel
                activeIndex={props.activeIndex}
                books={props.books}
                cardWidth={props.cardWidth}
                carouselSideInset={props.carouselSideInset}
                itemWidth={props.itemWidth}
                onCardPress={props.onCardPress}
                onMomentumScrollEnd={props.syncActiveIndex}
            />
            <TodayBookProgress activeBook={props.activeBook} />
            <TodayStatsSection stats={props.stats} />
        </ScrollView>
    );
}

/** Derive carousel metrics, active-book state, and theme state for the screen. */
function useTodayScreenState(books: TodayBookCard[]): TodayScreenState {
    const { cardWidth, itemWidth, carouselSideInset } = useCarouselMetrics();
    const { activeBook, activeIndex, setActiveIndex, syncActiveIndex } =
        useTodayActiveBook(books, itemWidth);
    const { currentTheme, previousTheme, themeProgress } =
        useTodayThemeTransition(books, activeIndex);

    return {
        activeBook,
        activeIndex,
        cardWidth,
        carouselSideInset,
        currentTheme,
        itemWidth,
        onCardPress: setActiveIndex,
        previousTheme,
        syncActiveIndex,
        themeProgress,
    };
}

/**
 * Renders the mobile Today screen with active-book carousel, progress, and stats.
 * @param books - Ordered list of book cards available in the carousel.
 * @param stats - Summary statistics rendered below the session controls.
 * @returns Full Today screen scroll view for the current reading state.
 */
export function TodayScreen({ books, stats }: TodayScreenProps) {
    const { activeBook, ...TODAY_SCREEN_STATE } = useTodayScreenState(books);

    if (!activeBook) {
        return null;
    }

    const TODAY_SCREEN_CONTENT_PROPS: TodayScreenContentProps = {
        activeBook,
        books,
        stats,
        ...TODAY_SCREEN_STATE,
    };

    return <TodayScreenContent {...TODAY_SCREEN_CONTENT_PROPS} />;
}
