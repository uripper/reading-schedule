import { type PlannerApi } from "@reading-schedule/contracts";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ComingSoonScreen } from "../features/common/coming_soon_screen";
import { TodayScreenContainer } from "../features/today/today_screen_container";
import {
    type MobileTabKey,
    type StackNavigator,
    type StackRoute,
} from "./types";

interface MobileNavigationProps {
    plannerApi: PlannerApi;
}

type TabStacks = Record<MobileTabKey, StackRoute[]>;

const LOGO_BACKGROUND = require("../../assets/logo-background.png");
const LOGO = require("../../assets/logo.png");

const MENU_ITEMS: readonly MobileTabKey[] = ["today", "books", "settings"];

function tabLabel(tab: MobileTabKey): string {
    if (tab === "today") {
        return "Today";
    }
    if (tab === "books") {
        return "Books";
    }
    return "Settings";
}

function rootStacks(plannerApi: PlannerApi): TabStacks {
    return {
        books: [
            {
                key: "books-root",
                render(navigator) {
                    return (
                        <ComingSoonScreen
                            ctaLabel="Open Queue"
                            description="Book list and sorting tools are next in the mobile rollout."
                            onPress={() => {
                                navigator.push({
                                    key: "books-queue",
                                    render() {
                                        return (
                                            <ComingSoonScreen
                                                ctaLabel="Back"
                                                description="Queue details will show here once mobile list models are integrated."
                                                onPress={navigator.pop}
                                                title="Queue"
                                            />
                                        );
                                    },
                                    title: "Queue",
                                });
                            }}
                            title="Books"
                        />
                    );
                },
                title: "Books",
            },
        ],
        settings: [
            {
                key: "settings-root",
                render(navigator) {
                    return (
                        <ComingSoonScreen
                            ctaLabel="View Preferences"
                            description="Settings and profile controls will land after core reading flows."
                            onPress={() => {
                                navigator.push({
                                    key: "settings-preferences",
                                    render() {
                                        return (
                                            <ComingSoonScreen
                                                ctaLabel="Back"
                                                description="Preference forms will connect to planner state once settings screens are implemented."
                                                onPress={navigator.pop}
                                                title="Preferences"
                                            />
                                        );
                                    },
                                    title: "Preferences",
                                });
                            }}
                            title="Settings"
                        />
                    );
                },
                title: "Settings",
            },
        ],
        today: [
            {
                key: "today-root",
                render() {
                    return <TodayScreenContainer plannerApi={plannerApi} />;
                },
                title: "Today",
            },
        ],
    };
}

function pushRoute(
    stacks: TabStacks,
    activeTab: MobileTabKey,
    route: StackRoute,
): TabStacks {
    const CURRENT_STACK = stacks[activeTab];
    return {
        ...stacks,
        [activeTab]: [...CURRENT_STACK, route],
    };
}

function popRoute(stacks: TabStacks, activeTab: MobileTabKey): TabStacks {
    const CURRENT_STACK = stacks[activeTab];
    if (CURRENT_STACK.length <= 1) {
        return stacks;
    }
    return {
        ...stacks,
        [activeTab]: CURRENT_STACK.slice(0, CURRENT_STACK.length - 1),
    };
}

export function MobileNavigation({ plannerApi }: MobileNavigationProps) {
    const INITIAL_STACKS = useMemo(() => rootStacks(plannerApi), [plannerApi]);
    const [activeTab, setActiveTab] = useState<MobileTabKey>("today");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [stacks, setStacks] = useState<TabStacks>(INITIAL_STACKS);

    const ACTIVE_STACK = stacks[activeTab];
    const ACTIVE_ROUTE = ACTIVE_STACK[ACTIVE_STACK.length - 1];
    if (!ACTIVE_ROUTE) {
        return null;
    }

    function push(route: StackRoute): void {
        setIsMenuOpen(false);
        setStacks((previous) => pushRoute(previous, activeTab, route));
    }

    function pop(): void {
        setIsMenuOpen(false);
        setStacks((previous) => popRoute(previous, activeTab));
    }

    const NAVIGATOR: StackNavigator = {
        pop,
        push,
    };

    const SHOW_BACK = ACTIVE_STACK.length > 1;

    function activateTab(tab: MobileTabKey): void {
        setActiveTab(tab);
        setIsMenuOpen(false);
    }

    let MENU = null;
    if (isMenuOpen) {
        MENU = (
            <View style={styles.menuPanel}>
                {MENU_ITEMS.map((tab) => {
                    const IS_ACTIVE = tab === activeTab;
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => {
                                activateTab(tab);
                            }}
                            style={[styles.menuItem, IS_ACTIVE ? styles.menuItemActive : null]}
                        >
                            <Text style={styles.menuItemText}>{tabLabel(tab)}</Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    let BACK_BUTTON = null;
    if (SHOW_BACK) {
        BACK_BUTTON = (
            <Pressable onPress={pop} style={styles.backButton}>
                <Text style={styles.backText}>Back</Text>
            </Pressable>
        );
    }

    return (
        <View style={styles.appFrame}>
            <View style={styles.topBar}>
                <View style={styles.logoWrap}>
                    <Image source={LOGO_BACKGROUND} style={styles.logoBackground} />
                    <Image source={LOGO} style={styles.logo} />
                </View>

                <View style={styles.topActions}>
                    {BACK_BUTTON}
                    <Pressable
                        onPress={() => {
                            setIsMenuOpen((previous) => !previous);
                        }}
                        style={styles.menuToggle}
                    >
                        <Text style={styles.menuToggleText}>Menu</Text>
                    </Pressable>
                </View>
            </View>

            {MENU}

            <View style={styles.screen}>{ACTIVE_ROUTE.render(NAVIGATOR)}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    appFrame: {
        flex: 1,
    },
    backButton: {
        backgroundColor: "#FFFFFF",
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
    logo: {
        height: 30,
        left: 14,
        position: "absolute",
        top: 12,
        width: 118,
    },
    logoBackground: {
        height: 54,
        width: 160,
    },
    logoWrap: {
        height: 54,
        position: "relative",
        width: 160,
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
        backgroundColor: "#FFFFFF",
        borderColor: "#0D0D0D",
        borderRadius: 12,
        borderWidth: 2,
        marginRight: 12,
        marginTop: 8,
        overflow: "hidden",
        position: "absolute",
        right: 0,
        top: 56,
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
        backgroundColor: "#F3F7EA",
        borderBottomColor: "#0D0D0D",
        borderBottomWidth: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
});
