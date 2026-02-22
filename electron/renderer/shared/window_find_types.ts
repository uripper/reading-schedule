export type WindowFindRequest = {
  query?: string;
  forward?: boolean;
  findNext?: boolean;
};

export type WindowFindResponse = {
  matches: number;
  activeMatchOrdinal: number;
};
