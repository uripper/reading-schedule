import { type TodayBookCard, type TodayStats } from "./types";

export const TODAY_BOOKS: TodayBookCard[] = [
    {
        accent: "#9CD2EE",
        author: "William Shakespeare",
        completionPercent: 32,
        id: "hamlet",
        pagesDone: 55,
        pagesTotal: 170,
        title: "Hamlet",
    },
    {
        accent: "#F16865",
        author: "Miguel de Cervantes",
        completionPercent: 12,
        id: "don-quixote",
        pagesDone: 137,
        pagesTotal: 1100,
        title: "Don Quixote",
    },
    {
        accent: "#B5E080",
        author: "Jorge Luis Borges",
        completionPercent: 32,
        id: "ficciones",
        pagesDone: 55,
        pagesTotal: 170,
        title: "Ficciones",
    },
];

export const TODAY_STATS: TodayStats = {
    completedSessions: "1/8",
    dayStreak: 28,
};
