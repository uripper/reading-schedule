import type { PlannerApi } from "@reading-schedule/contracts";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TodayScreen } from "./today_screen_view";
import { useTodayData } from "./use_today_data";

interface TodayScreenContainerProps {
    plannerApi: PlannerApi;
}

export function TodayScreenContainer({
    plannerApi,
}: TodayScreenContainerProps) {
    const { books, errorMessage, isLoading, refresh, stats } =
        useTodayData(plannerApi);

    if (isLoading) {
        return (
            <View style={STYLES.centered}>
                <Text style={STYLES.headline}>Loading today...</Text>
            </View>
        );
    }

    if (errorMessage) {
        return (
            <View style={STYLES.centered}>
                <Text style={STYLES.headline}>Could not load today</Text>
                <Text style={STYLES.detail}>{errorMessage}</Text>
                <Pressable onPress={refresh} style={STYLES.button}>
                    <Text style={STYLES.buttonLabel}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    if (books.length === 0) {
        return (
            <View style={STYLES.centered}>
                <Text style={STYLES.headline}>No books to show yet</Text>
                <Pressable onPress={refresh} style={STYLES.button}>
                    <Text style={STYLES.buttonLabel}>Refresh</Text>
                </Pressable>
            </View>
        );
    }

    return <TodayScreen books={books} stats={stats} />;
}

const STYLES = StyleSheet.create({
    button: {
        backgroundColor: "#F3D731",
        borderColor: "#0D0D0D",
        borderRadius: 100,
        borderWidth: 3,
        marginTop: 14,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    buttonLabel: {
        color: "#131313",
        fontSize: 16,
        fontWeight: "700",
    },
    centered: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    detail: {
        color: "#131313",
        fontSize: 14,
        marginTop: 8,
        textAlign: "center",
    },
    headline: {
        color: "#131313",
        fontSize: 24,
        fontWeight: "800",
        textAlign: "center",
    },
});
