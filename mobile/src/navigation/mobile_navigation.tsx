/**
 * Renders the mobile app shell, tab menu, and per-tab stack navigation.
 */
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

/**
 * Props for the mobile navigation shell.
 */
interface MobileNavigationProps {
    plannerApi: PlannerApi;
}

/**
 * Declares the tabs shown in the mobile menu.
 */
const MENU_ITEMS: readonly MobileTabKey[] = ["today", "books", "settings"];

/**
 * Updates the mobile menu open state.
 */
type MenuSetter = Dispatch<SetStateAction<boolean>>;

/**
 * Updates the tab stack state.
 */
type StackSetter = Dispatch<SetStateAction<TabStacks>>;

/**
 * Updates the currently active mobile tab.
 */
type TabSetter = Dispatch<SetStateAction<MobileTabKey>>;

/**
 * Holds the mobile navigation state and its setters.
 */
interface MobileNavigationState {
    activeTab: MobileTabKey;
    isMenuOpen: boolean;
    setActiveTab: TabSetter;
    setIsMenuOpen: MenuSetter;
    setStacks: StackSetter;
    stacks: TabStacks;
}

/**
 * Arguments used to render the mobile navigation frame.
 */
interface NavigationFrameArgs {
    activeRoute: StackRoute;
    activeTab: MobileTabKey;
    isMenuOpen: boolean;
    navigator: StackNavigator;
    onSelectTab(tab: MobileTabKey): void;
    onToggleMenu(): void;
    showBack: boolean;
}

/**
 * Derived route context for the active mobile tab.
 */
interface NavigationRouteContext {
    activeRoute: StackRoute | null;
    navigator: StackNavigator;
    onSelectTab(tab: MobileTabKey): void;
    onToggleMenu(): void;
    showBack: boolean;
}

/**
 * Returns the display label for a mobile tab key.
 */
function tabLabel(tab: MobileTabKey): string {
    if (tab === "today") {
        return "Today";
    }
    if (tab === "books") {
        return "Books";
    }
    return "Settings";
}

/**
 * Pushes a route onto the active tab stack.
 */
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

/**
 * Closes the mobile menu.
 */
function closeMenu(setIsMenuOpen: MenuSetter): void {
    setIsMenuOpen(false);
}

/**
 * Toggles the mobile menu open state.
 */
function toggleMenu(setIsMenuOpen: MenuSetter): void {
    setIsMenuOpen((previous) => !previous);
}

/**
 * Switches the active tab and closes the menu.
 */
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

/**
 * Props for the mobile slide-down menu panel.
 */
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

/**
 * Renders the back button when the active stack can pop.
 */
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

/**
 * Props for the mobile top bar.
 */
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

/**
 * Pops the active tab stack when there is more than one route.
 */
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
 * Creates the local navigation state for the mobile shell.
 */
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

/**
 * Renders the menu panel only when it is open.
 */
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

/**
 * Renders the mobile shell around the active route.
 */
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

/**
 * Derives the active route and handlers from the current navigation state.
 */
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

/**
 * Returns a callback that toggles the menu.
 */
function menuToggleHandler(setIsMenuOpen: MenuSetter): () => void {
    return (): void => {
        toggleMenu(setIsMenuOpen);
    };
}

/**
 * Returns a callback that selects a tab and closes the menu.
 */
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
