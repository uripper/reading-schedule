import { env } from "node:process";

const PRODUCTION_ENVIRONMENT = "production";

export function readEnvironmentValue(name: string): string | undefined {
    const VALUE = env[name];

    if (typeof VALUE !== "string") {
        return undefined;
    }

    return VALUE;
}

export function processEnvironment(): NodeJS.ProcessEnv {
    return env;
}

export function isProductionEnvironment(): boolean {
    return readEnvironmentValue("NODE_ENV") === PRODUCTION_ENVIRONMENT;
}
