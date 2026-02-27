export interface UpdateBookProgressOptions {
  notifyBooksChanged?: boolean;
}

export interface BindBooksUIOptions {
  onEstimatedFinishNavigate?(this: void, dateKey: string): void;
}
