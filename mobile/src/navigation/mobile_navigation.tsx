import type { PlannerApi } from "@reading-schedule/contracts";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import LOGO from "../../assets/logo.png";
import LOGO_BACKGROUND from "../../assets/logo-background.png";
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

const MENU_ITEMS: readonly MobileTabKey[] = ["today", "books", "settings"];

type MenuSetter = Dispatch<SetStateAction<boolean>>;
type StackSetter = Dispatch<SetStateAction<TabStacks>>;
type TabSetter = Dispatch<SetStateAction<MobileTabKey>>;

interface MobileNavigationState {
    activeTab: MobileTabKey;
    isMenuOpen: boolean;
    setActiveTab: TabSetter;
    setIsMenuOpen: MenuSetter;
    setStacks: StackSetter;
    stacks: TabStacks;
}

interface NavigationFrameArgs {
    activeRoute: StackRoute;
    activeTab: MobileTabKey;
    isMenuOpen: boolean;
    navigator: StackNavigator;
    onSelectTab(tab: MobileTabKey): void;
    onToggleMenu(): void;
    showBack: boolean;
}

interface NavigationRouteContext {
    activeRoute: StackRoute | null;
    navigator: StackNavigator;
    onSelectTab(tab: MobileTabKey): void;
    onToggleMenu(): void;
    showBack: boolean;
}

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
 * MenuPanel({ activeTab: 'home', onSelectTab: handleTabSelection })
 * <View>...JSX element representing the menu panel...</View>
 * @param {MenuPanelProps} props - Props object containing activeTab (the currently selected tab) and onSelectTab (callback invoked when a tab is selected).
 * @returns {JSX.Element} JSX element representing the rendered menu panel.
 **/
function MenuPanel({ activeTab, onSelectTab }: MenuPanelProps) {
    return (
        <View style={STYLES.menuPanel}>
            {MENU_ITEMS.map((tab) => {
                const IS_ACTIVE = tab === activeTab;
                let menuItemActiveStyle: typeof STYLES.menuItemActive | null =
                    null;
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

function backButtonNode(onBack: () => void, showBack: boolean): ReactNode {
    if (!showBack) {
        return null;
    }
    return (
        <Pressable onPress={onBack} style={STYLES.backButton}>
            <Text style={STYLES.backText}>Back</Text>
        </Pressable>
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
                {backButtonNode(onBack, showBack)}
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

function useMobileNavigationState(
    plannerApi: PlannerApi,
): MobileNavigationState {
    const INITIAL_STACKS = useMemo(
        () => createRootStacks(plannerApi),
        [plannerApi],
    );
    const [ACTIVE_TAB, SET_ACTIVE_TAB] = useState<MobileTabKey>("today");
    const [IS_MENU_OPEN, SET_IS_MENU_OPEN] = useState(false);
    const [STACKS, SET_STACKS] = useState<TabStacks>(INITIAL_STACKS);
    return {
        activeTab: ACTIVE_TAB,
        isMenuOpen: IS_MENU_OPEN,
        setActiveTab: SET_ACTIVE_TAB,
        setIsMenuOpen: SET_IS_MENU_OPEN,
        setStacks: SET_STACKS,
        stacks: STACKS,
    };
}

function menuNode(
    activeTab: MobileTabKey,
    isMenuOpen: boolean,
    onSelectTab: (tab: MobileTabKey) => void,
): ReactNode {
    if (!isMenuOpen) {
        return null;
    }
    return <MenuPanel activeTab={activeTab} onSelectTab={onSelectTab} />;
}

function navigationFrame({
    activeRoute,
    activeTab,
    isMenuOpen,
    navigator,
    onSelectTab,
    onToggleMenu,
    showBack,
}: NavigationFrameArgs): ReactNode {
    return (
        <View style={STYLES.appFrame}>
            <MobileTopBar
                onBack={navigator.pop}
                onToggleMenu={onToggleMenu}
                showBack={showBack}
            />
            {menuNode(activeTab, isMenuOpen, onSelectTab)}
            <View style={STYLES.screen}>{activeRoute.render(navigator)}</View>
        </View>
    );
}

function navigationRouteContext(
    state: MobileNavigationState,
): NavigationRouteContext {
    const ACTIVE_STACK = state.stacks[state.activeTab];
    const ACTIVE_ROUTE = ACTIVE_STACK.at(-1) ?? null;
    return {
        activeRoute: ACTIVE_ROUTE,
        navigator: createNavigator(
            state.activeTab,
            state.setIsMenuOpen,
            state.setStacks,
        ),
        onSelectTab: tabSelectionHandler(
            state.setActiveTab,
            state.setIsMenuOpen,
        ),
        onToggleMenu: menuToggleHandler(state.setIsMenuOpen),
        showBack: ACTIVE_STACK.length > 1,
    };
}

function menuToggleHandler(setIsMenuOpen: MenuSetter): () => void {
    return (): void => {
        toggleMenu(setIsMenuOpen);
    };
}

function tabSelectionHandler(
    setActiveTab: TabSetter,
    setIsMenuOpen: MenuSetter,
): (tab: MobileTabKey) => void {
    return (tab: MobileTabKey): void => {
        selectTab(tab, setActiveTab, setIsMenuOpen);
    };
}

/**
 * Renders the mobile shell with top-bar navigation and per-tab route stacks.
 * @param plannerApi - Planner API client injected into tab root screens.
 * @returns Navigation frame that renders the active route for the selected tab.
 */
export function MobileNavigation({ plannerApi }: MobileNavigationProps) {
    const STATE = useMobileNavigationState(plannerApi);
    const ROUTE_CONTEXT = navigationRouteContext(STATE);
    if (ROUTE_CONTEXT.activeRoute === null) {
        return null;
    }
    return navigationFrame({
        activeRoute: ROUTE_CONTEXT.activeRoute,
        activeTab: STATE.activeTab,
        isMenuOpen: STATE.isMenuOpen,
        navigator: ROUTE_CONTEXT.navigator,
        onSelectTab: ROUTE_CONTEXT.onSelectTab,
        onToggleMenu: ROUTE_CONTEXT.onToggleMenu,
        showBack: ROUTE_CONTEXT.showBack,
    });
}
