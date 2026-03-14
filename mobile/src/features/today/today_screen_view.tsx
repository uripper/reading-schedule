import type { ComponentProps } from "react";
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
import { TodayThemeTransitionLayer } from "./today_theme_transition_layer.tsx";
import type { TodayBookCard, TodayStats } from "./types.ts";

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

/**
 * Render a single carousel card for a book with cover art and tap handler.
 * @example
 * CarouselCard({ book: { title: '1984', accent: '#ff0' }, isActive: true, onPress: () => {} })
 * <Pressable ...>...</Pressable>
 * @param book - Book object containing at least title and accent color used for cover and background.
 * @param isActive - Whether this card is the active/selected item (affects opacity).
 * @param onPress - Callback invoked when the card is pressed.
 * @returns A Pressable JSX element representing the card.
 **/
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

interface TodayCarouselItemProps {
    activeIndex: number;
    book: TodayBookCard;
    cardWidth: number;
    index: number;
    onCardPress(index: number): void;
}

type TodayTheme = ReturnType<typeof useTodayThemeTransition>["currentTheme"];

interface TodayScreenContentProps {
    activeBook: TodayBookCard;
    activeIndex: number;
    books: TodayBookCard[];
    cardWidth: number;
    carouselSideInset: number;
    currentTheme: TodayTheme;
    itemWidth: number;
    onCardPress(index: number): void;
    previousTheme: TodayTheme;
    stats: TodayStats;
    syncActiveIndex: TodayCarouselProps["onMomentumScrollEnd"];
    themeProgress: ComponentProps<typeof TodayThemeTransitionLayer>["progress"];
}

interface TodayScreenState {
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

const CAROUSEL_SPACER_STYLE = { width: CAROUSEL_GAP } as const;

/**
 * Render the "TODAY" hero section with theme transition, ambient background, and layered title text.
 * @example
 * TodayHero({ ambientColor: '#E0F7FA', currentThemeCanvasColor: '#FFFFFF', previousThemeCanvasColor: '#000000', themeProgress: 0.5 })
 * <React.Fragment>Today theme transition layer, background, and layered "TODAY" text</React.Fragment>
 * @param props - Props object containing ambientColor, currentThemeCanvasColor, previousThemeCanvasColor, and themeProgress.
 * @returns Returns a JSX fragment that composes the theme transition layer, background, and rendered TITLE elements.
 **/
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

function CarouselSpacer() {
    return <View style={CAROUSEL_SPACER_STYLE} />;
}

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

function carouselContentStyle(carouselSideInset: number) {
    return [STYLES.carouselRow, { paddingHorizontal: carouselSideInset }];
}

function contentStyle(canvasColor: string) {
    return [STYLES.content, { backgroundColor: canvasColor }];
}

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

/**
 * Renders a horizontal carousel of book cards using FlatList.
 * @example
 * TodayCarousel({ activeIndex: 0, books: [{ id: '1', title: 'Sample' }], cardWidth: 200, carouselSideInset: 16, itemWidth: 216, onCardPress: (i) => console.log(i), onMomentumScrollEnd: () => {} })
 * <FlatList ... />
 * @param activeIndex - Index of the currently active/visible card.
 * @param books - Array of book objects to render in the carousel.
 * @param cardWidth - Width (in pixels) of each card container.
 * @param carouselSideInset - Horizontal padding applied to the carousel content container.
 * @param itemWidth - Snap interval width used by FlatList (card width + gap).
 * @param onCardPress - Callback invoked with the index of a pressed card.
 * @param onMomentumScrollEnd - Callback forwarded to FlatList's onMomentumScrollEnd event.
 * @returns Rendered carousel FlatList component.
 **/
function TodayCarousel(props: TodayCarouselProps) {
    const TODAY_CAROUSEL_PROPS = createTodayCarouselListProps(props);
    return <FlatList {...TODAY_CAROUSEL_PROPS} />;
}

/**
 * Renders the current active book's title, author, progress pill, and a "Log Session" button for the Today screen.
 * @example
 * TodayBookProgress({ activeBook: { title: 'The Hobbit', author: 'J.R.R. Tolkien', completionPercent: 42, pagesDone: 123, pagesTotal: 295 } })
 * <Text>THE HOBBIT | J.R.R. TOLKIEN</Text> plus a progress pill "42% | 123/295" and a "Log Session" button
 * @param {TodayBookProgressProps} props - Props object containing the activeBook to display.
 * @returns {JSX.Element} Rendered JSX element showing the active book progress and a Log Session button.
 **/
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

/**
 * Renders a horizontal row of statistic bubbles and connector visuals for today's stats.
 * @example
 * TodayStatsSection({ stats: { dayStreak: 5, completedSessions: 3 } })
 * <View>...StatBubble day streak and complete sessions...</View>
 * @param stats - Props object containing today's statistics (e.g., dayStreak and completedSessions).
 * @returns A JSX.Element that displays the stats row for the Today screen.
 **/
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
