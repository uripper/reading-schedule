export interface WindowFindRequest {
  query?: string;
  forward?: boolean;
  findNext?: boolean;
}

export interface WindowFindResponse {
  matches: number;
  activeMatchOrdinal: number;
}
