export interface Preferences {
    dailyGoalMinutes: number;
    /** Local database path; an empty value disables connection checks. */
    koboDatabasePath?: string;
    /** Disables checks without forgetting the selected file. */
    koboSyncEnabled?: boolean;
    /** Kobo content IDs explicitly excluded from future sync checks. */
    koboIgnoredContentIds?: string[];
    reduceMotion: boolean;
    reminderEnabled: boolean;
    reminderTime: string;
    timezone: string;
}

export interface FeatureFlags {
    gamificationEnabled: boolean;
    socialEnabled: boolean;
}

export type PreferencesInput = Partial<Preferences> & {
    daily_goal_minutes?: number | string;
};

export type FeatureFlagsInput = Partial<FeatureFlags>;

export type FeatureFlagRawValue = boolean | number | string | null | undefined;

export type ReminderTimeRawValue = number | string | null | undefined;

export type ExperienceSettingsApplyHandler = (event: Event) => void;

export interface SelectOption {
    label: string;
    value: string;
}

interface BaseFieldDefinition {
    hint?: string;
    id: string;
    label: string;
    max?: number;
    min?: number;
    pattern?: string;
    step?: string;
}

export type SelectFieldDefinition = BaseFieldDefinition & {
    type: "select";
    options: SelectOption[];
};

export type InputFieldDefinition = BaseFieldDefinition & {
    type: "number" | "date" | "checkbox";
};

export type FieldDefinition = SelectFieldDefinition | InputFieldDefinition;

export type FieldGroupName = "display" | "minutes" | "plan";
