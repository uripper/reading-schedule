import type { BookLookupItem } from "./types_lookup.js";

export interface Preferences {
	theme: "system" | "light" | "dark";
	reduceMotion: boolean;
	timezone: string;
	dailyGoalMinutes: number;
	reminderEnabled: boolean;
	reminderTime: string;
}

export interface FeatureFlags {
	gamificationEnabled: boolean;
	socialEnabled: boolean;
	recommendationsEnabled: boolean;
}

export type PreferencesInput = Partial<Preferences> & {
	daily_goal_minutes?: number | string;
};

export type FeatureFlagsInput = Partial<FeatureFlags>;

export type FeatureFlagRawValue = boolean | number | string | null | undefined;

export type ReminderTimeRawValue = number | string | null | undefined;

export type ExperienceSettingsApplyHandler = (event: Event) => void;

export interface SelectOption {
	value: string;
	label: string;
}

export interface BaseFieldDefinition {
	id: string;
	label: string;
	hint?: string;
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
	shelfInput: HTMLSelectElement;
	titleInput: HTMLInputElement;
	authorInput: HTMLInputElement;
	wordsInput: HTMLInputElement;
}

export interface RenderRecommendationsArgs {
	recommendations: RecommendationItem[];
	onAddToShelf(recommendation: RecommendationItem): void;
}

export interface RecommendationSearchApi {
	searchBooks(query: string, author?: boolean): Promise<BookLookupItem[]>;
}
