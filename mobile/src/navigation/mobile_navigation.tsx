import type { PlannerApi } from "@reading-schedule/contracts";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { ComingSoonScreen } from "../features/common/coming_soon_screen";
import { TodayScreenContainer } from "../features/today/today_screen_container";
import { styles } from "./mobile_navigation_styles";
import type { MobileTabKey, StackNavigator, StackRoute } from "./types";

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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: stack declarations are explicit route wiring.
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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: top-level shell component keeps navigation state local.
export function MobileNavigation({ plannerApi }: MobileNavigationProps) {
    const INITIAL_STACKS = useMemo(() => rootStacks(plannerApi), [plannerApi]);
    const [ACTIVE_TAB, SET_ACTIVE_TAB] = useState<MobileTabKey>("today");
    const [IS_MENU_OPEN, SET_IS_MENU_OPEN] = useState(false);
    const [STACKS, SET_STACKS] = useState<TabStacks>(INITIAL_STACKS);

    const ACTIVE_STACK = STACKS[ACTIVE_TAB];
    const ACTIVE_ROUTE = ACTIVE_STACK[ACTIVE_STACK.length - 1];
    if (!ACTIVE_ROUTE) {
        return null;
    }

    function push(route: StackRoute): void {
        SET_IS_MENU_OPEN(false);
        SET_STACKS((previous) => pushRoute(previous, ACTIVE_TAB, route));
    }

    function pop(): void {
        SET_IS_MENU_OPEN(false);
        SET_STACKS((previous) => popRoute(previous, ACTIVE_TAB));
    }

    const NAVIGATOR: StackNavigator = {
        pop,
        push,
    };

    const SHOW_BACK = ACTIVE_STACK.length > 1;

    function activateTab(tab: MobileTabKey): void {
        SET_ACTIVE_TAB(tab);
        SET_IS_MENU_OPEN(false);
    }

    let menu = null;
    if (IS_MENU_OPEN) {
        menu = (
            <View style={styles.menuPanel}>
                {MENU_ITEMS.map((tab) => {
                    const IS_ACTIVE = tab === ACTIVE_TAB;
                    let menuItemActiveStyle = null;
                    if (IS_ACTIVE) {
                        menuItemActiveStyle = styles.menuItemActive;
                    }
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => {
                                activateTab(tab);
                            }}
                            style={[styles.menuItem, menuItemActiveStyle]}
                        >
                            <Text style={styles.menuItemText}>
                                {tabLabel(tab)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    let backButton = null;
    if (SHOW_BACK) {
        backButton = (
            <Pressable onPress={pop} style={styles.backButton}>
                <Text style={styles.backText}>Back</Text>
            </Pressable>
        );
    }

    return (
        <View style={styles.appFrame}>
            <View style={styles.topBar}>
                <View style={styles.brandBlock}>
                    <View style={styles.logoWrap}>
                        <Image
                            source={LOGO_BACKGROUND}
                            style={styles.logoBackground}
                        />
                        <Image source={LOGO} style={styles.logo} />
                    </View>
                    <Text numberOfLines={1} style={styles.brandText}>
                        BARTLEBY
                    </Text>
                </View>

                <View style={styles.topActions}>
                    {backButton}
                    <Pressable
                        onPress={() => {
                            SET_IS_MENU_OPEN((previous) => !previous);
                        }}
                        style={styles.menuToggle}
                    >
                        <Text style={styles.menuToggleText}>Menu</Text>
                    </Pressable>
                </View>
            </View>

            {menu}

            <View style={styles.screen}>{ACTIVE_ROUTE.render(NAVIGATOR)}</View>
        </View>
    );
}
