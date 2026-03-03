import { type PlannerApi } from "@reading-schedule/contracts";
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
            <View style={styles.centered}>
                <Text style={styles.headline}>Loading today...</Text>
            </View>
        );
    }

    if (errorMessage) {
        return (
            <View style={styles.centered}>
                <Text style={styles.headline}>Could not load today</Text>
                <Text style={styles.detail}>{errorMessage}</Text>
                <Pressable onPress={refresh} style={styles.button}>
                    <Text style={styles.buttonLabel}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    if (books.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.headline}>No books to show yet</Text>
                <Pressable onPress={refresh} style={styles.button}>
                    <Text style={styles.buttonLabel}>Refresh</Text>
                </Pressable>
            </View>
        );
    }

    return <TodayScreen books={books} stats={stats} />;
}

const styles = StyleSheet.create({
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
