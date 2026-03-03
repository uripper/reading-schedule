import { TodayBackground } from "@features/today/today_background";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    FlatList,
    Image,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { themeFromBook } from "./today_background_theme";
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

const CAROUSEL_GAP = 16;
const MIN_CAROUSEL_SIDE_INSET = 12;
const THEME_TRANSITION_DURATION_MS = 700;
const DEFAULT_COVER_SOURCE = require("../../../assets/book-covers/Hamlet.jpg");

const COVER_SOURCES: Record<string, number> = {
    "2666": require("../../../assets/book-covers/2666.jpg"),
    "Anna Karenina": require("../../../assets/book-covers/AnnaKarenina.jpg"),
    "Don Quixote": require("../../../assets/book-covers/DonQuixote.jpg"),
    Ficciones: require("../../../assets/book-covers/Ficciones.jpg"),
    Hamlet: require("../../../assets/book-covers/Hamlet.jpg"),
    "Moby-Dick": require("../../../assets/book-covers/MobyDick.jpg"),
};

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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: component split planned after interaction model stabilizes.
export function TodayScreen({ books, stats }: TodayScreenProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeBook = books[activeIndex] ?? books[0] ?? null;

    const { width } = useWindowDimensions();
    const activeBookTitle = activeBook?.title ?? "";
    const activeBookHasCover = hasCoverForBook(activeBookTitle);
    const backgroundTheme = useMemo(() => {
        return themeFromBook(activeBookTitle, activeBookHasCover);
    }, [activeBookHasCover, activeBookTitle]);
    const [previousTheme, setPreviousTheme] = useState(backgroundTheme);
    const [currentTheme, setCurrentTheme] = useState(backgroundTheme);
    const previousThemeRef = useRef(backgroundTheme);
    const transitionIdRef = useRef(0);
    const themeProgress = useRef(new Animated.Value(1)).current;

    useLayoutEffect(() => {
        const previous = previousThemeRef.current;
        const hasChanged =
            previous.canvasColor !== backgroundTheme.canvasColor ||
            previous.ambientColor !== backgroundTheme.ambientColor;
        if (!hasChanged) {
            return;
        }

        setPreviousTheme(previous);
        setCurrentTheme(backgroundTheme);
        themeProgress.stopAnimation();
        themeProgress.setValue(0);
        const transitionId = transitionIdRef.current + 1;
        transitionIdRef.current = transitionId;
        Animated.timing(themeProgress, {
            duration: THEME_TRANSITION_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) {
                return;
            }
            if (transitionIdRef.current !== transitionId) {
                return;
            }
            previousThemeRef.current = backgroundTheme;
            setPreviousTheme(backgroundTheme);
            setCurrentTheme(backgroundTheme);
        });
    }, [backgroundTheme, themeProgress]);

    const cardWidth = useMemo(() => {
        const baseCardWidth = 214;
        const edgePadding = 82;
        const candidate = width - edgePadding;
        if (candidate < baseCardWidth) {
            return baseCardWidth;
        }
        if (candidate > 294) {
            return 294;
        }
        return candidate;
    }, [width]);

    const itemWidth = cardWidth + CAROUSEL_GAP;
    const carouselSideInset = useMemo(() => {
        const rawInset = (width - cardWidth) / 2;
        if (rawInset < MIN_CAROUSEL_SIDE_INSET) {
            return MIN_CAROUSEL_SIDE_INSET;
        }
        return rawInset;
    }, [cardWidth, width]);

    if (!activeBook) {
        return null;
    }

    function syncActiveIndex(
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ): void {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / itemWidth);
        if (index < 0 || index >= books.length) {
            return;
        }
        setActiveIndex(index);
    }

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
                        <View style={{ width: cardWidth }}>
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
