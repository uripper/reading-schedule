import type { PlannerApi } from "@reading-schedule/contracts";
import { ComingSoonScreen } from "../features/common/coming_soon_screen.tsx";
import { TodayScreenContainer } from "../features/today/today_screen_container.tsx";
import type { StackRoute, TabStacks } from "./types.ts";

/**
 * Create a StackRoute representing the "Queue" screen (a coming-soon placeholder).
 * @example
 * createQueueRoute()
 * // returns:
 * // {
 * //   key: "books-queue",
 * //   render: (navigator) => <ComingSoonScreen ctaLabel="Back" description="Queue details will show here once mobile list models are integrated." onPress={navigator.pop} title="Queue" />,
 * //   title: "Queue"
 * // }
 * @returns {StackRoute} Route object for the "Queue" screen used by the mobile navigator.
 */
function createQueueRoute(): StackRoute {
    return {
        key: "books-queue",
        render(navigator) {
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
    };
}

/**
 * Create the root navigation route for the Books section.
 * @example
 * createBooksRootRoute()
 * { key: "books-root", title: "Books", render: (navigator) => <ComingSoonScreen ... /> }
 * @returns The route object for the Books root screen.
 **/
function createBooksRootRoute(): StackRoute {
    return {
        key: "books-root",
        render(navigator) {
            return (
                <ComingSoonScreen
                    ctaLabel="Open Queue"
                    description="Book list and sorting tools are next in the mobile rollout."
                    onPress={() => {
                        navigator.push(createQueueRoute());
                    }}
                    title="Books"
                />
            );
        },
        title: "Books",
    };
}

/**
 * Create a StackRoute for the "Preferences" settings screen that renders a ComingSoonScreen placeholder.
 * @example
 * createPreferencesRoute()
 * {
 *   key: "settings-preferences",
 *   render: (navigator) => <ComingSoonScreen title="Preferences" ctaLabel="Back" ... />,
 *   title: "Preferences",
 * }
 * @returns {StackRoute} A route object configured for the Preferences screen.
 **/
function createPreferencesRoute(): StackRoute {
    return {
        key: "settings-preferences",
        render(navigator) {
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
    };
}

/**
 * Create a navigation route for the Settings root screen.
 * @example
 * createSettingsRootRoute()
 * { key: "settings-root", title: "Settings", render: (navigator) => <ComingSoonScreen ... /> }
 * @returns {StackRoute} StackRoute object representing the Settings root route.
 **/
function createSettingsRootRoute(): StackRoute {
    return {
        key: "settings-root",
        render(navigator) {
            return (
                <ComingSoonScreen
                    ctaLabel="View Preferences"
                    description="Settings and profile controls will land after core reading flows."
                    onPress={() => {
                        navigator.push(createPreferencesRoute());
                    }}
                    title="Settings"
                />
            );
        },
        title: "Settings",
    };
}

function createTodayRootRoute(plannerApi: PlannerApi): StackRoute {
    return {
        key: "today-root",
        render() {
            return <TodayScreenContainer plannerApi={plannerApi} />;
        },
        title: "Today",
    };
}

export function createRootStacks(plannerApi: PlannerApi): TabStacks {
    return {
        books: [createBooksRootRoute()],
        settings: [createSettingsRootRoute()],
        today: [createTodayRootRoute(plannerApi)],
    };
}
