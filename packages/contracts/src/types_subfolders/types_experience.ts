import type { BookLookupItem } from "./types_lookup.js";

export interface Preferences {
    dailyGoalMinutes: number;
    reduceMotion: boolean;
    reminderEnabled: boolean;
    reminderTime: string;
    theme: "system" | "light" | "dark";
    timezone: string;
}

export interface FeatureFlags {
    gamificationEnabled: boolean;
    recommendationsEnabled: boolean;
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

export type FieldGroupName = "window" | "budget" | "weights" | "display";

export interface RecommendationSeed {
    title: string;
    wordsTotal: number;
}

export interface RecommendationItem {
    author: string;
    coverUrl: string;
    title: string;
    wordsTotal: number;
}

export interface RecommendationFormTarget {
    authorInput: HTMLInputElement;
    shelfInput: HTMLSelectElement;
    titleInput: HTMLInputElement;
    wordsInput: HTMLInputElement;
}

export interface RenderRecommendationsArgs {
    onAddToShelf(recommendation: RecommendationItem): void;
    recommendations: RecommendationItem[];
}

export interface RecommendationSearchApi {
    searchBooks(query: string, author?: boolean): Promise<BookLookupItem[]>;
}
