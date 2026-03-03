import { StyleSheet } from "react-native";

const BORDER_COLOR = "#0D0D0D";
const BUTTON_COLOR = "#F3D731";
const CANVAS_COLOR = "#9CD2EE";
export const HEADER_SHADOW_BLUE = "#2A74FF";
export const HEADER_SHADOW_PURPLE = "#8753FF";
export const HEADER_TEXT = "#E3DE87";
const PANEL_COLOR = "#E8E8E8";
const PRIMARY_TEXT = "#131313";
export const STAT_A = "#BC7FAF";
export const STAT_B = "#7FBC8C";

export const STYLES = StyleSheet.create({
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
        height: 352,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 10, width: 10 },
        shadowOpacity: 0.75,
        shadowRadius: 0,
    },
    carouselList: {
        flexGrow: 0,
    },
    carouselRow: {
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    content: {
        backgroundColor: CANVAS_COLOR,
        minHeight: "100%",
        paddingBottom: 44,
        position: "relative",
    },
    coverImage: {
        height: "100%",
        resizeMode: "cover",
        width: "100%",
    },
    currentBook: {
        backgroundColor: "#EFEFEF",
        borderColor: BORDER_COLOR,
        borderTopWidth: 2,
        color: PRIMARY_TEXT,
        fontSize: 19,
        fontWeight: "900",
        marginTop: 2,
        paddingHorizontal: 18,
        paddingVertical: 6,
        textAlign: "center",
    },
    hero: {
        paddingBottom: 4,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    progressPill: {
        backgroundColor: PANEL_COLOR,
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 3,
        marginHorizontal: 20,
        marginTop: 14,
        paddingVertical: 14,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 4, width: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    progressText: {
        color: PRIMARY_TEXT,
        fontSize: 36,
        fontWeight: "800",
        lineHeight: 42,
        textAlign: "center",
    },
    sessionButton: {
        alignItems: "center",
        backgroundColor: BUTTON_COLOR,
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 3,
        marginHorizontal: 58,
        marginTop: 22,
        paddingVertical: 13,
        shadowColor: BORDER_COLOR,
        shadowOffset: { height: 5, width: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    sessionButtonLabel: {
        color: PRIMARY_TEXT,
        fontSize: 24,
        fontWeight: "700",
    },
    statBubble: {
        alignItems: "center",
        borderColor: BORDER_COLOR,
        borderRadius: 999,
        borderWidth: 4,
        height: 154,
        justifyContent: "center",
        width: 154,
    },
    statConnectorDot: {
        backgroundColor: "#F2F2F2",
        borderRadius: 999,
        height: 8,
        left: "50%",
        marginLeft: -4,
        marginTop: -4,
        position: "absolute",
        top: "58%",
        width: 8,
    },
    statConnectorHorizontal: {
        backgroundColor: "#F2F2F2",
        height: 2,
        left: "26%",
        position: "absolute",
        top: "58%",
        width: "48%",
    },
    statConnectorVertical: {
        backgroundColor: "#F2F2F2",
        height: 242,
        left: "50%",
        marginLeft: -1,
        position: "absolute",
        top: -62,
        width: 2,
    },
    statLabel: {
        color: PRIMARY_TEXT,
        fontSize: 12,
        fontWeight: "600",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        marginTop: 42,
        paddingBottom: 62,
        position: "relative",
    },
    statValue: {
        color: PRIMARY_TEXT,
        fontSize: 54,
        fontWeight: "900",
    },
    todayShadow: {
        fontSize: 106,
        fontWeight: "900",
        left: 0,
        lineHeight: 108,
        opacity: 0.88,
        position: "absolute",
        top: 10,
    },
    todayShadowMid: {
        fontSize: 106,
        fontWeight: "900",
        left: 8,
        lineHeight: 108,
        opacity: 0.86,
        position: "absolute",
        top: 8,
    },
    todayTitle: {
        fontSize: 106,
        fontWeight: "900",
        lineHeight: 108,
        textShadowColor: BORDER_COLOR,
        textShadowOffset: { height: 3, width: 4 },
        textShadowRadius: 0,
    },
});
