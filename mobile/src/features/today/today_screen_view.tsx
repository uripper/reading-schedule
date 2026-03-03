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
import { type TodayBookCard, type TodayStats } from "./types";

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
    let CARD_OPACITY = 0.64;
    if (isActive) {
        CARD_OPACITY = 1;
    }

    return (
        <Pressable
            onPress={onPress}
            style={[STYLES.card, { opacity: CARD_OPACITY }]}
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

export function TodayScreen({ books, stats }: TodayScreenProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeBook = books[activeIndex] ?? books[0];
    if (!activeBook) {
        return null;
    }

    const { width } = useWindowDimensions();
    const ACTIVE_BOOK_HAS_COVER = hasCoverForBook(activeBook.title);
    const BACKGROUND_THEME = useMemo(() => {
        return themeFromBook(activeBook.title, ACTIVE_BOOK_HAS_COVER);
    }, [ACTIVE_BOOK_HAS_COVER, activeBook.title]);
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

    function syncActiveIndex(
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ): void {
        const OFFSET_X = event.nativeEvent.contentOffset.x;
        const INDEX = Math.round(OFFSET_X / ITEM_WIDTH);
        if (INDEX < 0 || INDEX >= books.length) {
            return;
        }
        setActiveIndex(INDEX);
    }

    return (
        <ScrollView
            bounces={false}
            contentContainerStyle={[
                STYLES.content,
                { backgroundColor: CURRENT_THEME.canvasColor },
            ]}
        >
            <TodayThemeTransitionLayer
                fromColor={PREVIOUS_THEME.canvasColor}
                progress={THEME_PROGRESS}
                toColor={CURRENT_THEME.canvasColor}
            />
            <TodayBackground ambientColor={CURRENT_THEME.ambientColor} />

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
                    { paddingHorizontal: CAROUSEL_SIDE_INSET },
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
                        <View style={{ width: CARD_WIDTH }}>
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
                snapToInterval={ITEM_WIDTH}
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
