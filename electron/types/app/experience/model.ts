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
