export interface CalendarControlsState {
  months: string[];
  index: number;
}

export type RenderFn = () => void;

export type JumpToTodayFn = () => void;
