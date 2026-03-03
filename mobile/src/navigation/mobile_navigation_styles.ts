import { StyleSheet } from "react-native";

const MENU_PANEL_TOP = 88;
const TOP_BAR_BOTTOM_PADDING = 8;
const TOP_BAR_TOP_PADDING = 25;

export const styles = StyleSheet.create({
    appFrame: {
        flex: 1,
    },
    backButton: {
        backgroundColor: "#E9E9DE",
        borderColor: "#0D0D0D",
        borderRadius: 999,
        borderWidth: 2,
        marginRight: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backText: {
        color: "#131313",
        fontSize: 14,
        fontWeight: "700",
    },
    brandBlock: {
        alignItems: "flex-start",
        justifyContent: "center",
        width: 204,
    },
    brandText: {
        color: "#090909",
        fontSize: 24,
        fontWeight: "900",
        left: 60,
        letterSpacing: 0.4,
        maxWidth: 140,
        position: "absolute",
        top: 20,
    },
    logo: {
        height: 36,
        left: 9,
        position: "absolute",
        top: 7,
        transform: [{ rotate: "-42deg" }],
        width: 36,
    },
    logoBackground: {
        height: 58,
        transform: [{ rotate: "-4deg" }],
        width: 66,
    },
    logoWrap: {
        height: 58,
        position: "relative",
        width: 70,
    },
    menuItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    menuItemActive: {
        backgroundColor: "#F3D731",
    },
    menuItemText: {
        color: "#131313",
        fontSize: 16,
        fontWeight: "700",
    },
    menuPanel: {
        alignSelf: "flex-end",
        backgroundColor: "#E9E9DE",
        borderColor: "#0D0D0D",
        borderRadius: 12,
        borderWidth: 2,
        marginRight: 12,
        marginTop: 8,
        overflow: "hidden",
        position: "absolute",
        right: 0,
        top: MENU_PANEL_TOP,
        width: 180,
        zIndex: 20,
    },
    menuToggle: {
        backgroundColor: "#F3D731",
        borderColor: "#0D0D0D",
        borderRadius: 999,
        borderWidth: 2,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    menuToggleText: {
        color: "#131313",
        fontSize: 15,
        fontWeight: "800",
    },
    screen: {
        flex: 1,
        zIndex: 1,
    },
    topActions: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    topBar: {
        alignItems: "center",
        backgroundColor: "#9CD2EE",
        borderBottomColor: "#0D0D0D",
        borderBottomWidth: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: TOP_BAR_BOTTOM_PADDING,
        paddingHorizontal: 12,
        paddingTop: TOP_BAR_TOP_PADDING,
    },
});
