import type { PlannerApi } from "@reading-schedule/contracts";
import { ComingSoonScreen } from "../features/common/coming_soon_screen";
import { TodayScreenContainer } from "../features/today/today_screen_container";
import type { StackRoute, TabStacks } from "./types";

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
