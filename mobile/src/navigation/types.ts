import { type ReactNode } from "react";

export type MobileTabKey = "today" | "books" | "settings";

export interface StackNavigator {
    pop(): void;
    push(route: StackRoute): void;
}

export interface StackRoute {
    key: string;
    render(navigator: StackNavigator): ReactNode;
    title: string;
}
