import type { JsonValue } from "../types_json";

export interface BridgeResponse {
  data?: JsonValue;
  error?: string;
  ok?: boolean;
}
