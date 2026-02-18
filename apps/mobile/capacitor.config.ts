import type { CapacitorConfig } from "@capacitor/cli";
import path from "node:path";

const config: CapacitorConfig = {
  appId: "com.readingschedule.app",
  appName: "Reading Schedule",
  webDir: path.resolve(__dirname, "../client/dist"),
  bundledWebRuntime: false,
  server: {
    cleartext: true,
  },
};

export default config;
