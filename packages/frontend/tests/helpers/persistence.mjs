/** Persistence queue fixtures shared by serialization and failure tests. */
function testFeatureFlags() {
    return {
        gamificationEnabled: true,
        socialEnabled: true,
    };
}

function testPreferences() {
    return {
        dailyGoalMinutes: 30,
        reduceMotion: false,
        reminderEnabled: false,
        reminderTime: "20:00",
        timezone: "UTC",
    };
}

function ignoreLog() {
    return undefined;
}

function baseQueueArgs(saveState) {
    return {
        addLog: ignoreLog,
        collectBooks: () => [],
        collectSettings: () => ({}),
        getSessions: () => [],
        plannerApi: { saveState },
        state: {
            blockedDayBooks: {},
            featureFlags: testFeatureFlags(),
            lastResult: null,
            preferences: testPreferences(),
            ready: true,
            scheduleCompletions: {},
        },
    };
}

export { baseQueueArgs };
