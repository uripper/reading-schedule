import { type PlannerApi } from "@reading-schedule/contracts";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { ComingSoonScreen } from "../features/common/coming_soon_screen";
import { TodayScreenContainer } from "../features/today/today_screen_container";
import { styles } from "./mobile_navigation_styles";
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
                    let MENU_ITEM_ACTIVE_STYLE = null;
                    if (IS_ACTIVE) {
                        MENU_ITEM_ACTIVE_STYLE = styles.menuItemActive;
                    }
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => {
                                activateTab(tab);
                            }}
                            style={[styles.menuItem, MENU_ITEM_ACTIVE_STYLE]}
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

