import { useMemo, useState } from "react";
import {
    FlatList,
    Image,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { type TodayBookCard, type TodayStats } from "./types";

const BORDER_COLOR = "#0D0D0D";
const BUTTON_COLOR = "#F3D731";
const CANVAS_COLOR = "#9CD2EE";
const HEADER_SHADOW_BLUE = "#2A74FF";
const HEADER_SHADOW_PURPLE = "#8753FF";
const HEADER_TEXT = "#E3DE87";
const PANEL_COLOR = "#E8E8E8";
const PRIMARY_TEXT = "#131313";
const STAT_A = "#BC7FAF";
const STAT_B = "#7FBC8C";
const CAROUSEL_GAP = 14;
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

function CarouselCard({ book, isActive, onPress }: CardProps) {
    let CARD_OPACITY = 0.64;
    if (isActive) {
        CARD_OPACITY = 1;
    }

    return (
        <Pressable onPress={onPress} style={[styles.card, { opacity: CARD_OPACITY }]}>
            <View style={[styles.bookArt, { backgroundColor: book.accent }]}> 
                <Image source={coverForBook(book.title)} style={styles.coverImage} />
            </View>
            <View style={styles.bookMeta}>
                <Text style={styles.bookMetaText}>{book.author.toUpperCase()}</Text>
            </View>
        </Pressable>
    );
}

function StatBubble({ fill, label, value }: StatBubbleProps) {
    return (
        <View style={[styles.statBubble, { backgroundColor: fill }]}> 
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
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
    const CARD_WIDTH = useMemo(() => {
        const BASE_CARD_WIDTH = 196;
        const EDGE_PADDING = 74;
        const CANDIDATE = width - EDGE_PADDING;
        if (CANDIDATE < BASE_CARD_WIDTH) {
            return BASE_CARD_WIDTH;
        }
        if (CANDIDATE > 278) {
            return 278;
        }
        return CANDIDATE;
    }, [width]);

    const ITEM_WIDTH = CARD_WIDTH + CAROUSEL_GAP;

    function syncActiveIndex(event: NativeSyntheticEvent<NativeScrollEvent>): void {
        const OFFSET_X = event.nativeEvent.contentOffset.x;
        const INDEX = Math.round(OFFSET_X / ITEM_WIDTH);
        if (INDEX < 0 || INDEX >= books.length) {
            return;
        }
        setActiveIndex(INDEX);
    }

    return (
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <View style={styles.bgObjectA} />
            <View style={styles.bgObjectB} />
            <View style={styles.bgObjectC} />

            <View style={styles.hero}>
                <Text style={[styles.todayShadow, { color: HEADER_SHADOW_BLUE }]}>TODAY</Text>
                <Text style={[styles.todayShadowMid, { color: HEADER_SHADOW_PURPLE }]}>TODAY</Text>
                <Text style={[styles.todayTitle, { color: HEADER_TEXT }]}>TODAY</Text>
            </View>

            <FlatList
                data={books}
                decelerationRate="fast"
                horizontal
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={syncActiveIndex}
                renderItem={({ item, index }) => {
                    return (
                        <View style={{ marginRight: CAROUSEL_GAP, width: CARD_WIDTH }}>
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
                style={styles.carouselList}
                contentContainerStyle={styles.carouselRow}
            />

            <Text style={styles.currentBook}>
                {activeBook.title.toUpperCase()} | {activeBook.author.toUpperCase()}
            </Text>

            <View style={styles.progressPill}>
                <Text style={styles.progressText}>
                    {activeBook.completionPercent}% | {activeBook.pagesDone}/{activeBook.pagesTotal}
                </Text>
            </View>

            <Pressable style={styles.sessionButton}>
                <Text style={styles.sessionButtonLabel}>Log Session</Text>
            </Pressable>

            <View style={styles.statsRow}>
                <StatBubble fill={STAT_A} label="Day Streak" value={String(stats.dayStreak)} />
                <StatBubble
                    fill={STAT_B}
                    label="Complete Sessions"
                    value={stats.completedSessions}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    bgObjectA: {
        backgroundColor: "rgba(154, 201, 238, 0.46)",
        borderRadius: 180,
        height: 210,
        position: "absolute",
        right: -60,
        top: 88,
        transform: [{ rotate: "12deg" }],
        width: 210,
    },
    bgObjectB: {
        backgroundColor: "rgba(129, 199, 146, 0.30)",
        borderRadius: 260,
        height: 170,
        left: -50,
        position: "absolute",
        top: 334,
        transform: [{ rotate: "-18deg" }],
        width: 250,
    },
    bgObjectC: {
        backgroundColor: "rgba(120, 156, 228, 0.24)",
        borderRadius: 160,
        bottom: 160,
        height: 150,
        position: "absolute",
        right: -45,
        width: 160,
    },
    bookArt: {
        alignItems: "center",
        borderColor: BORDER_COLOR,
        borderWidth: 3,
        flex: 1,
        justifyContent: "center",
        overflow: "hidden",
    },
    bookMeta: {
        backgroundColor: "rgba(7, 7, 7, 0.72)",
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    bookMetaText: {
        color: "#F5F5F5",
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
    card: {
        borderColor: BORDER_COLOR,
        borderWidth: 4,
        height: 238,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 6, width: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 0,
    },
    carouselList: {
        flexGrow: 0,
    },
    carouselRow: {
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    content: {
        backgroundColor: CANVAS_COLOR,
        minHeight: "100%",
        paddingBottom: 36,
        position: "relative",
    },
    coverImage: {
        height: "100%",
        resizeMode: "cover",
        width: "100%",
    },
    currentBook: {
        borderColor: BORDER_COLOR,
        borderTopWidth: 2,
        color: PRIMARY_TEXT,
        fontSize: 24,
        fontWeight: "900",
        marginTop: 6,
        paddingHorizontal: 18,
        paddingTop: 10,
        textAlign: "center",
    },
    hero: {
        paddingBottom: 8,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    progressPill: {
        backgroundColor: PANEL_COLOR,
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 3,
        marginHorizontal: 20,
        marginTop: 14,
        paddingVertical: 16,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 4, width: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    progressText: {
        color: PRIMARY_TEXT,
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
    },
    sessionButton: {
        alignItems: "center",
        backgroundColor: BUTTON_COLOR,
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 3,
        marginHorizontal: 46,
        marginTop: 24,
        paddingVertical: 14,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 5, width: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    sessionButtonLabel: {
        color: PRIMARY_TEXT,
        fontSize: 38,
        fontWeight: "700",
    },
    statBubble: {
        alignItems: "center",
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 4,
        height: 148,
        justifyContent: "center",
        width: 148,
    },
    statLabel: {
        color: PRIMARY_TEXT,
        fontSize: 16,
        fontWeight: "600",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        marginTop: 38,
    },
    statValue: {
        color: PRIMARY_TEXT,
        fontSize: 46,
        fontWeight: "900",
    },
    todayShadow: {
        fontSize: 88,
        fontWeight: "900",
        left: 0,
        lineHeight: 92,
        opacity: 0.88,
        position: "absolute",
        top: 22,
    },
    todayShadowMid: {
        fontSize: 88,
        fontWeight: "900",
        left: 5,
        lineHeight: 92,
        opacity: 0.86,
        position: "absolute",
        top: 20,
    },
    todayTitle: {
        fontSize: 88,
        fontWeight: "900",
        lineHeight: 92,
        textShadowColor: BORDER_COLOR,
        textShadowOffset: { height: 3, width: 4 },
        textShadowRadius: 0,
    },
});
