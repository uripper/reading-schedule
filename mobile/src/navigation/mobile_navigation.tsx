import type { PlannerApi } from "@reading-schedule/contracts";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { createRootStacks } from "./mobile_navigation_routes.tsx";
import { STYLES } from "./mobile_navigation_styles.ts";
import type {
    MobileTabKey,
    StackNavigator,
    StackRoute,
    TabStacks,
} from "./types.ts";

interface MobileNavigationProps {
    plannerApi: PlannerApi;
}

const LOGO_BACKGROUND = require("../../assets/logo-background.png");
const LOGO = require("../../assets/logo.png");

const MENU_ITEMS: readonly MobileTabKey[] = ["today", "books", "settings"];

type MenuSetter = Dispatch<SetStateAction<boolean>>;
type StackSetter = Dispatch<SetStateAction<TabStacks>>;
type TabSetter = Dispatch<SetStateAction<MobileTabKey>>;

function tabLabel(tab: MobileTabKey): string {
    if (tab === "today") {
        return "Today";
    }
    if (tab === "books") {
        return "Books";
    }
    return "Settings";
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

function closeMenu(setIsMenuOpen: MenuSetter): void {
    setIsMenuOpen(false);
}

function toggleMenu(setIsMenuOpen: MenuSetter): void {
    setIsMenuOpen((previous) => !previous);
}

function selectTab(
    tab: MobileTabKey,
    setActiveTab: TabSetter,
    setIsMenuOpen: MenuSetter,
): void {
    setActiveTab(tab);
    closeMenu(setIsMenuOpen);
}

/**
 * Create a StackNavigator for the given active mobile tab that closes the menu and updates stack state when navigating.
 * @example
 * createNavigator('homeTab', setMenuOpen, setStacks)
 * { pop: [Function], push: [Function] }
 * @param activeTab - The key of the currently active mobile tab.
 * @param setIsMenuOpen - Setter function to open or close the mobile menu.
 * @param setStacks - Setter function to update the navigation stacks state.
 * @returns Return an object with pop and push methods to navigate within the active tab.
 **/
function createNavigator(
    activeTab: MobileTabKey,
    setIsMenuOpen: MenuSetter,
    setStacks: StackSetter,
): StackNavigator {
    return {
        pop() {
            closeMenu(setIsMenuOpen);
            setStacks((previous) => popRoute(previous, activeTab));
        },
        push(route: StackRoute) {
            closeMenu(setIsMenuOpen);
            setStacks((previous) => pushRoute(previous, activeTab, route));
        },
    };
}

interface MenuPanelProps {
    activeTab: MobileTabKey;
    onSelectTab(tab: MobileTabKey): void;
}

/**
 * Renders a menu panel with selectable tabs and highlights the active tab.
 * @example
 * MenuPanel({ activeTab: 'home', onSelectTab: (tab) => console.log(tab) })
 * <View>...JSX element representing the menu panel...</View>
 * @param {MenuPanelProps} props - Props object containing activeTab (the currently selected tab) and onSelectTab (callback invoked when a tab is selected).
 * @returns {JSX.Element} JSX element representing the rendered menu panel.
 **/
function MenuPanel({ activeTab, onSelectTab }: MenuPanelProps) {
    return (
        <View style={STYLES.menuPanel}>
            {MENU_ITEMS.map((tab) => {
                const IS_ACTIVE = tab === activeTab;
                let menuItemActiveStyle = null;
                if (IS_ACTIVE) {
                    menuItemActiveStyle = STYLES.menuItemActive;
                }
                const MENU_ITEM_STYLE = [STYLES.menuItem, menuItemActiveStyle];
                return (
                    <Pressable
                        key={tab}
                        onPress={() => {
                            onSelectTab(tab);
                        }}
                        style={MENU_ITEM_STYLE}
                    >
                        <Text style={STYLES.menuItemText}>{tabLabel(tab)}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

interface MobileTopBarProps {
    onBack(): void;
    onToggleMenu(): void;
    showBack: boolean;
}

/**
 * MobileTopBar component that renders the app branding and top action buttons for mobile navigation.
 * @example
 * MobileTopBar({ onBack: () => {}, onToggleMenu: () => {}, showBack: true })
 * <View>...top bar JSX...</View>
 * @param onBack - Callback invoked when the back button is pressed.
 * @param onToggleMenu - Callback invoked to toggle the menu.
 * @param showBack - Whether to display the back button.
 * @returns Rendered top bar JSX element.
 **/
function MobileTopBar({ onBack, onToggleMenu, showBack }: MobileTopBarProps) {
    let backButton = null;
    if (showBack) {
        backButton = (
            <Pressable onPress={onBack} style={STYLES.backButton}>
                <Text style={STYLES.backText}>Back</Text>
            </Pressable>
        );
    }

    return (
        <View style={STYLES.topBar}>
            <View style={STYLES.brandBlock}>
                <View style={STYLES.logoWrap}>
                    <Image
                        source={LOGO_BACKGROUND}
                        style={STYLES.logoBackground}
                    />
                    <Image source={LOGO} style={STYLES.logo} />
                </View>
                <Text numberOfLines={1} style={STYLES.brandText}>
                    BARTLEBY
                </Text>
            </View>

            <View style={STYLES.topActions}>
                {backButton}
                <Pressable onPress={onToggleMenu} style={STYLES.menuToggle}>
                    <Text style={STYLES.menuToggleText}>Menu</Text>
                </Pressable>
            </View>
        </View>
    );
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

/**
 * Renders the mobile shell with top-bar navigation and per-tab route stacks.
 * @param plannerApi - Planner API client injected into tab root screens.
 * @returns Navigation frame that renders the active route for the selected tab.
 */
export function MobileNavigation({ plannerApi }: MobileNavigationProps) {
    const INITIAL_STACKS = useMemo(
        () => createRootStacks(plannerApi),
        [plannerApi],
    );
    const [ACTIVE_TAB, SET_ACTIVE_TAB] = useState<MobileTabKey>("today");
    const [IS_MENU_OPEN, SET_IS_MENU_OPEN] = useState(false);
    const [STACKS, SET_STACKS] = useState<TabStacks>(INITIAL_STACKS);
    const ACTIVE_STACK = STACKS[ACTIVE_TAB];
    const ACTIVE_ROUTE = ACTIVE_STACK.at(-1);
    const NAVIGATOR = createNavigator(ACTIVE_TAB, SET_IS_MENU_OPEN, SET_STACKS);
    const SHOW_BACK = ACTIVE_STACK.length > 1;

    if (!ACTIVE_ROUTE) {
        return null;
    }

    let menu = null;
    if (IS_MENU_OPEN) {
        menu = (
            <MenuPanel
                activeTab={ACTIVE_TAB}
                onSelectTab={(tab) => {
                    selectTab(tab, SET_ACTIVE_TAB, SET_IS_MENU_OPEN);
                }}
            />
        );
    }

    return (
        <View style={STYLES.appFrame}>
            <MobileTopBar
                onBack={NAVIGATOR.pop}
                onToggleMenu={() => {
                    toggleMenu(SET_IS_MENU_OPEN);
                }}
                showBack={SHOW_BACK}
            />
            {menu}
            <View style={STYLES.screen}>{ACTIVE_ROUTE.render(NAVIGATOR)}</View>
        </View>
    );
}
