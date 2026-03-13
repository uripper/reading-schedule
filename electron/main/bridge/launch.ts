/**
 * Planner bridge launch resolution for dev and packaged runtimes.
 */
import { dirname } from "node:path";
import { readEnvironmentValue } from "../runtime-env.ts";
import { root } from "./context.ts";
import {
    bundledPlannerPath,
    bundledPlannerWorkingDirectory,
    hasBundledPlanner,
} from "./runtime.ts";

const DEFAULT_PYTHON_BINARY = "python";
const PYTHON_BINARY_ENV_KEY = "PYTHON_BIN";

/**
 * Spawn command details for one planner invocation.
 */
export interface PlannerLaunchSpec {
    /** CLI arguments forwarded to the selected planner entrypoint. */
    args: string[];
    /** Executable command path used to start the planner process. */
    command: string;
    /** Working directory used for planner execution. */
    cwd: string;
}

function pythonBinary(): string {
    const OVERRIDE_BINARY = readEnvironmentValue(PYTHON_BINARY_ENV_KEY);
    if (typeof OVERRIDE_BINARY === "string" && OVERRIDE_BINARY.trim() !== "") {
        return OVERRIDE_BINARY.trim();
    }
    return DEFAULT_PYTHON_BINARY;
}

function pythonPlannerLaunch(
    moduleName: string,
    args: string[],
): PlannerLaunchSpec {
    return {
        args: ["-m", moduleName, ...args],
        command: pythonBinary(),
        cwd: root(),
    };
}

function bundledPlannerLaunch(
    moduleName: string,
    args: string[],
): PlannerLaunchSpec {
    const PLANNER_PATH = bundledPlannerPath();
    let workingDirectory = bundledPlannerWorkingDirectory();
    if (workingDirectory === "") {
        workingDirectory = dirname(PLANNER_PATH);
    }
    return {
        args: [moduleName, ...args],
        command: PLANNER_PATH,
        cwd: workingDirectory,
    };
}

/**
 * Resolves the concrete subprocess command for the planner bridge.
 * @param moduleName - Planner module name to execute.
 * @param args - CLI arguments forwarded to the planner.
 * @returns Spawn command, args, and working directory.
 */
export function resolvePlannerLaunch(
    moduleName: string,
    args: string[],
): PlannerLaunchSpec {
    if (hasBundledPlanner()) {
        return bundledPlannerLaunch(moduleName, args);
    }
    return pythonPlannerLaunch(moduleName, args);
}
