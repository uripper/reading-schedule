import { SafeAreaView, StyleSheet, View } from "react-native";
import { createMobilePlannerApi } from "./api/planner_client";
import { mobilePlannerApiBaseUrl } from "./config/mobile_env";
import { TodayScreen } from "./features/today/today_screen";

const plannerApi = createMobilePlannerApi(mobilePlannerApiBaseUrl());

export function MobileApp() {
    const HAS_PLANNER_API = Boolean(plannerApi);
    if (!HAS_PLANNER_API) {
        return null;
    }
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <TodayScreen />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        backgroundColor: "#F3F7EA",
        flex: 1,
    },
});
