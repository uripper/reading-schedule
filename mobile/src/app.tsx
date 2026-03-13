import { SafeAreaView, StyleSheet, View } from "react-native";
import { createMobilePlannerApi } from "./api/planner_client.ts";
import { mobilePlannerApiBaseUrl } from "./config/mobile_env.ts";
import { MobileNavigation } from "./navigation/mobile_navigation.tsx";

const PLANNER_API = createMobilePlannerApi(mobilePlannerApiBaseUrl());

export function MobileApp() {
    return (
        <SafeAreaView style={STYLES.safeArea}>
            <View style={STYLES.viewport}>
                <View style={STYLES.container}>
                    <MobileNavigation plannerApi={PLANNER_API} />
                </View>
            </View>
        </SafeAreaView>
    );
}

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
        maxWidth: 460,
        width: "100%",
    },
    safeArea: {
        backgroundColor: "#9CD2EE",
        flex: 1,
    },
    viewport: {
        alignItems: "center",
        flex: 1,
        width: "100%",
    },
});
