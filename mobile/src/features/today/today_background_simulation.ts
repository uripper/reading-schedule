import { BACKGROUND_SPRITES } from "./today_background_sprites.ts";
import {
    DESPAWN_BOTTOM_MARGIN,
    DRIFT_FORCE_MIN,
    DRIFT_FORCE_RANGE,
    FRAME_DT_CAP,
    GRAVITY_PER_SECOND,
    MAX_ACTIVE_OBJECTS,
    MIN_OPACITY,
    OPACITY_RANGE,
    SPAWN_INTERVAL_MS,
    SPIN_VELOCITY_MIN,
    SPIN_VELOCITY_RANGE,
    TOP_SPAWN_Y,
    VX_MIN,
    VX_RANGE,
    VY_MIN,
    VY_RANGE,
    WALL_BOUNCE,
    Y_SPAWN_RANGE,
} from "./today_constants.ts";
import {
    bodyRadius,
    resolveAllCollisions,
} from "./today-background-collision.ts";
import type {
    BackgroundSimulationState,
    Body,
    Bounds,
} from "./today-background-simulation-types.ts";

interface StepContext {
    bounds: Bounds;
    deltaSeconds: number;
    timeSeconds: number;
}

/**
 * Creates a new simulation state container.
 * @returns Fresh mutable simulation state.
 */
export function createBackgroundSimulationState(): BackgroundSimulationState {
    return {
        bodies: [],
        lastFrameMs: 0,
        nextId: 1,
        spawnAccumulatorMs: 0,
        timeSeconds: 0,
    };
}

/**
 * Clears all state values so simulation can restart from scratch.
 * @param state - Simulation state to reset.
 */
export function resetBackgroundSimulation(
    state: BackgroundSimulationState,
): void {
    const SIMULATION = state;
    SIMULATION.bodies = [];
    SIMULATION.nextId = 1;
    SIMULATION.lastFrameMs = 0;
    SIMULATION.spawnAccumulatorMs = 0;
    SIMULATION.timeSeconds = 0;
}

/**
 * Returns the active bodies snapshot used by rendering.
 * @param state - Simulation state.
 * @returns Active bodies array.
 */
export function getBackgroundBodies(
    state: BackgroundSimulationState,
): readonly Body[] {
    return state.bodies;
}

/**
 * Advances simulation state by one frame.
 * @param state - Simulation state.
 * @param timeMs - Current animation frame timestamp in milliseconds.
 * @param bounds - Active horizontal/vertical movement boundaries.
 * @returns `false` on first frame (no previous delta), else `true`.
 */
export function tickBackgroundSimulation(
    state: BackgroundSimulationState,
    timeMs: number,
    bounds: Bounds,
): boolean {
    const SIMULATION = state;
    const LAST_FRAME_MS = SIMULATION.lastFrameMs;
    SIMULATION.lastFrameMs = timeMs;
    if (LAST_FRAME_MS === 0) {
        return false;
    }

    const RAW_DELTA_SECONDS = (timeMs - LAST_FRAME_MS) / 1000;
    const DELTA_SECONDS = Math.min(FRAME_DT_CAP, RAW_DELTA_SECONDS);

    maybeSpawn(SIMULATION, DELTA_SECONDS, bounds);
    step(SIMULATION, DELTA_SECONDS, bounds);

    return true;
}

/**
 * Maybe spawn new bodies into the background simulation when the spawn interval has elapsed.
 * @example
 * maybeSpawn(state, 0.016, bounds)
 * undefined
 * @param state - The simulation state containing bodies, spawn accumulator, and configuration.
 * @param deltaSeconds - Elapsed time in seconds since the last update.
 * @param bounds - The bounds within which new bodies should be spawned.
 * @returns No return value; may append new bodies to state.bodies when spawning occurs.
 **/
function maybeSpawn(
    state: BackgroundSimulationState,
    deltaSeconds: number,
    bounds: Bounds,
): void {
    const SIMULATION = state;
    SIMULATION.spawnAccumulatorMs += deltaSeconds * 1000;

    if (SIMULATION.spawnAccumulatorMs < SPAWN_INTERVAL_MS) {
        return;
    }

    SIMULATION.spawnAccumulatorMs = 0;

    const EXISTING_BODIES = SIMULATION.bodies.length;
    if (EXISTING_BODIES >= MAX_ACTIVE_OBJECTS) {
        return;
    }

    // Spawn a random count proportional to remaining capacity so population
    // grows smoothly as the scene fills.
    const CAPACITY = MAX_ACTIVE_OBJECTS - EXISTING_BODIES;
    const TARGET_BODIES = Math.ceil(CAPACITY * Math.random());

    for (let i = 0; i < TARGET_BODIES; i += 1) {
        SIMULATION.bodies.push(spawnBody(SIMULATION, bounds));
    }
}

function randomAngle(): number {
    return Math.random() * Math.PI * 2;
}

/**
 * Spawn a new background body with randomized position and motion properties and advance the simulation id.
 * @example
 * spawnBody(state, bounds)
 * {
 *   driftForce: 0.12,
 *   driftPhase: 1.5708,
 *   id: 42,
 *   index: 3,
 *   opacity: 0.85,
 *   radius: 12,
 *   spin: 0.5,
 *   spinVelocity: -0.02,
 *   vx: 0.3,
 *   vy: 1.1,
 *   x: 150,
 *   y: -10
 * }
 * @param state - Simulation state used to assign a unique id and track bodies.
 * @param bounds - Horizontal and vertical bounds used to constrain the spawn position.
 * @returns Newly created Body object with randomized visual and motion properties.
 **/
function spawnBody(state: BackgroundSimulationState, bounds: Bounds): Body {
    const SIMULATION = state;
    const INDEX = Math.floor(Math.random() * BACKGROUND_SPRITES.length);
    const RADIUS = bodyRadius(INDEX);

    const MIN_X = bounds.left + RADIUS;
    const X_RANGE = Math.max(1, bounds.right - bounds.left - RADIUS * 2);

    const NEXT_ID = SIMULATION.nextId;
    SIMULATION.nextId += 1;

    return {
        driftForce: randomRange(DRIFT_FORCE_MIN, DRIFT_FORCE_RANGE),
        driftPhase: randomAngle(),
        id: NEXT_ID,
        index: INDEX,
        opacity: MIN_OPACITY + Math.random() * OPACITY_RANGE,
        radius: RADIUS,
        spin: randomAngle(),
        spinVelocity: randomRange(SPIN_VELOCITY_MIN, SPIN_VELOCITY_RANGE),
        vx: randomRange(VX_MIN, VX_RANGE),
        vy: randomRange(VY_MIN, VY_RANGE),
        x: MIN_X + Math.random() * X_RANGE,
        y: TOP_SPAWN_Y - Math.random() * Y_SPAWN_RANGE,
    };
}

/**
 * Advance the background simulation by a time step: update time, integrate motion, resolve collisions, and despawn out-of-bounds entities.
 * @example
 * step(simState, 0.016, worldBounds)
 * undefined
 * @param state - The simulation state to update.
 * @param deltaSeconds - Time step in seconds to advance the simulation.
 * @param bounds - World bounds used for despawning and collision constraints.
 * @returns Void return; the function mutates the provided simulation state in place.
 **/
function step(
    state: BackgroundSimulationState,
    deltaSeconds: number,
    bounds: Bounds,
): void {
    const SIMULATION = state;
    SIMULATION.timeSeconds += deltaSeconds;

    integrate(SIMULATION, {
        bounds,
        deltaSeconds,
        timeSeconds: SIMULATION.timeSeconds,
    });
    resolveAllCollisions(SIMULATION.bodies);
    despawn(SIMULATION, bounds);
}

/**
 * Advance the background physics simulation by a timestep using semi-implicit Euler integration, applying gravity, sinusoidal drift, wall collisions, and spin updates.
 * @example
 * integrate(state, 0.016, {left: 0, right: 800}, performance.now())
 * undefined
 * @param state - Current simulation state containing an array of bodies to update.
 * @param deltaSeconds - Time step in seconds to advance the simulation.
 * @param bounds - Horizontal bounds with left and right edges used for collision handling.
 * @param now - Current time value used to compute per-body sinusoidal drift.
 * @returns No return value.
 **/
function integrate(
    state: BackgroundSimulationState,
    stepContext: StepContext,
): void {
    for (const BODY of state.bodies) {
        advanceBody(BODY, stepContext);
        resolveHorizontalBounce(BODY, stepContext.bounds);
    }
}

function despawn(state: BackgroundSimulationState, bounds: Bounds): void {
    const SIMULATION = state;
    const DESPAWN_EDGE = bounds.bottom + DESPAWN_BOTTOM_MARGIN;
    SIMULATION.bodies = SIMULATION.bodies.filter(
        (body) => body.y - body.radius < DESPAWN_EDGE,
    );
}

function randomRange(minimum: number, range: number): number {
    return minimum + Math.random() * range;
}

function advanceBody(body: Body, stepContext: StepContext): void {
    const BODY = body;
    const DRIFT =
        Math.sin(stepContext.timeSeconds + BODY.driftPhase) * BODY.driftForce;

    BODY.vx += DRIFT * stepContext.deltaSeconds;
    BODY.vy += GRAVITY_PER_SECOND * stepContext.deltaSeconds;
    BODY.x += BODY.vx * stepContext.deltaSeconds;
    BODY.y += BODY.vy * stepContext.deltaSeconds;
    BODY.spin += BODY.spinVelocity * stepContext.deltaSeconds;
}

function resolveHorizontalBounce(body: Body, bounds: Bounds): void {
    const BODY = body;
    const LEFT_EDGE = bounds.left;
    const RIGHT_EDGE = bounds.right;

    if (BODY.x - BODY.radius < LEFT_EDGE) {
        BODY.x = LEFT_EDGE + BODY.radius;
        BODY.vx = -BODY.vx * WALL_BOUNCE;
        return;
    }

    if (BODY.x + BODY.radius > RIGHT_EDGE) {
        BODY.x = RIGHT_EDGE - BODY.radius;
        BODY.vx = -BODY.vx * WALL_BOUNCE;
    }
}
