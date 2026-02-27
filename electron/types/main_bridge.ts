import type { JsonValue } from "./core_json.js";

export interface BridgeResponse {
  data?: JsonValue;
  error?: string;
  ok?: boolean;
}
