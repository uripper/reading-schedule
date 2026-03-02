import { useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { TODAY_BOOKS, TODAY_STATS } from "./sample_data";
import { type TodayBookCard } from "./types";

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

interface CardProps {
    book: TodayBookCard;
    isActive: boolean;
    onPress(): void;
}

function CarouselCard({ book, isActive, onPress }: CardProps) {
    let CARD_OPACITY = 0.62;
    if (isActive) {
        CARD_OPACITY = 1;
    }
    return (
        <Pressable onPress={onPress} style={[styles.card, { opacity: CARD_OPACITY }]}>
            <View style={[styles.bookArt, { backgroundColor: book.accent }]}>
                <Text style={styles.bookArtTitle}>{book.title}</Text>
            </View>
            <View style={styles.bookMeta}>
                <Text style={styles.bookMetaText}>{book.author.toUpperCase()}</Text>
            </View>
        </Pressable>
    );
}

interface StatBubbleProps {
    fill: string;
    label: string;
    value: string;
}

function StatBubble({ fill, label, value }: StatBubbleProps) {
    return (
        <View style={[styles.statBubble, { backgroundColor: fill }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export function TodayScreen() {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeBook = TODAY_BOOKS[activeIndex] ?? TODAY_BOOKS[0];
    if (!activeBook) {
        return null;
    }
    const { width } = useWindowDimensions();

    const CARD_WIDTH = useMemo(() => {
        const BASE_CARD_WIDTH = 184;
        const EDGE_PADDING = 46;
        const CANDIDATE = width - EDGE_PADDING;
        if (CANDIDATE < BASE_CARD_WIDTH) {
            return BASE_CARD_WIDTH;
        }
        if (CANDIDATE > 276) {
            return 276;
        }
        return CANDIDATE;
    }, [width]);

    return (
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <View style={styles.hero}>
                <Text style={[styles.todayShadow, { color: HEADER_SHADOW_BLUE }]}>TODAY</Text>
                <Text style={[styles.todayShadowMid, { color: HEADER_SHADOW_PURPLE }]}>TODAY</Text>
                <Text style={[styles.todayTitle, { color: HEADER_TEXT }]}>TODAY</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.carouselRow}
                horizontal
                showsHorizontalScrollIndicator={false}
            >
                {TODAY_BOOKS.map((book, index) => {
                    return (
                        <View key={book.id} style={{ width: CARD_WIDTH }}>
                            <CarouselCard
                                book={book}
                                isActive={index === activeIndex}
                                onPress={() => {
                                    setActiveIndex(index);
                                }}
                            />
                        </View>
                    );
                })}
            </ScrollView>

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
                <StatBubble fill={STAT_A} label="Day Streak" value={String(TODAY_STATS.dayStreak)} />
                <StatBubble
                    fill={STAT_B}
                    label="Complete Sessions"
                    value={TODAY_STATS.completedSessions}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    bookArt: {
        alignItems: "center",
        borderColor: BORDER_COLOR,
        borderWidth: 3,
        flex: 1,
        justifyContent: "center",
    },
    bookArtTitle: {
        color: PRIMARY_TEXT,
        fontSize: 24,
        fontWeight: "800",
        textAlign: "center",
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
        height: 250,
        marginHorizontal: 9,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 6, width: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 0,
    },
    carouselRow: {
        paddingHorizontal: 14,
        paddingVertical: 18,
    },
    content: {
        backgroundColor: CANVAS_COLOR,
        minHeight: "100%",
        paddingBottom: 36,
    },
    currentBook: {
        borderColor: BORDER_COLOR,
        borderTopWidth: 2,
        color: PRIMARY_TEXT,
        fontSize: 26,
        fontWeight: "900",
        marginTop: 6,
        paddingHorizontal: 18,
        paddingTop: 10,
        textAlign: "center",
    },
    hero: {
        paddingBottom: 8,
        paddingHorizontal: 20,
        paddingTop: 28,
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
        marginHorizontal: 70,
        marginTop: 26,
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
        fontSize: 92,
        fontWeight: "900",
        left: 0,
        lineHeight: 98,
        opacity: 0.88,
        position: "absolute",
        top: 30,
    },
    todayShadowMid: {
        fontSize: 92,
        fontWeight: "900",
        left: 5,
        lineHeight: 98,
        opacity: 0.86,
        position: "absolute",
        top: 28,
    },
    todayTitle: {
        fontSize: 92,
        fontWeight: "900",
        lineHeight: 98,
        textShadowColor: BORDER_COLOR,
        textShadowOffset: { height: 3, width: 4 },
        textShadowRadius: 0,
    },
});
