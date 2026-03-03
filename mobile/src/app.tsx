import { SafeAreaView, StyleSheet, View } from "react-native";
import { createMobilePlannerApi } from "./api/planner_client";
import { mobilePlannerApiBaseUrl } from "./config/mobile_env";
import { MobileNavigation } from "./navigation/mobile_navigation";

const plannerApi = createMobilePlannerApi(mobilePlannerApiBaseUrl());

export function MobileApp() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.viewport}>
                <View style={styles.container}>
                    <MobileNavigation plannerApi={plannerApi} />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
