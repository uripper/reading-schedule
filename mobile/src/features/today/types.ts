export interface TodayBookCard {
    accent: string;
    author: string;
    completionPercent: number;
    id: string;
    pagesDone: number;
    pagesTotal: number;
    title: string;
}

export interface TodayStats {
    completedSessions: string;
    dayStreak: number;
}
