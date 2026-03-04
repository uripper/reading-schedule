import { BACKGROUND_SPRITES } from "./today_background_sprites";
import {
    COLLISION_DAMPING,
    COLLISION_RESTITUTION,
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
    SPRITE_SCALE,
    TOP_SPAWN_Y,
    VX_MIN,
    VX_RANGE,
    VY_MIN,
    VY_RANGE,
    WALL_BOUNCE,
    Y_SPAWN_RANGE,
} from "./today_constants";

/**
 * Represents a single body in the background simulation.
 */
export interface Body {
    /**
     * Horizontal oscillation strength.
     */
    driftForce: number;
    /**
     * Phase offset for sinusoidal horizontal drift.
     */
    driftPhase: number;
    /**
     * Stable unique identifier used for rendering keys.
     */
    id: number;
    /**
     * Index into `BACKGROUND_SPRITES`.
     */
    index: number;
    /**
     * Render opacity in [0, 1].
     */
    opacity: number;
    /**
     * Approximate collision radius in pixels.
     */
    radius: number;
    /**
     * Current rotation angle in radians.
     */
    spin: number;
    /**
     * Angular velocity in radians/second.
     */
    spinVelocity: number;
    /**
     * Horizontal velocity in pixels/second.
     */
    vx: number;
    /**
     * Vertical velocity in pixels/second.
     */
    vy: number;
    /**
     * Horizontal position in pixels.
     */
    x: number;
    /**
     * Vertical position in pixels.
     */
    y: number;
}

/**
 * Defines the movement box for the background simulation.
 * Bodies can bounce between `left` and `right`, and are removed below `bottom`.
 */
export interface Bounds {
    /**
     * Y position of the despawn baseline (usually screen bottom).
     */
    readonly bottom: number;
    /**
     * Left wall X position where horizontal bounce is resolved.
     */
    readonly left: number;
    /**
     * Right wall X position where horizontal bounce is resolved.
     */
    readonly right: number;
}

/**
 * Mutable simulation state used by the function-based update pipeline.
 */
export interface BackgroundSimulationState {
    /**
     * Active bodies currently simulated.
     */
    bodies: Body[];
    /**
     * Previous animation-frame timestamp, in milliseconds.
     */
    lastFrameMs: number;
    /**
     * Monotonic counter used for assigning stable body IDs.
     */
    nextId: number;
    /**
     * Accumulated time used to trigger interval-based spawning.
     */
    spawnAccumulatorMs: number;
    /**
     * Total simulated elapsed time in seconds.
     */
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
    state.bodies = [];
    state.nextId = 1;
    state.lastFrameMs = 0;
    state.spawnAccumulatorMs = 0;
    state.timeSeconds = 0;
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
    const LAST = state.lastFrameMs;
    state.lastFrameMs = timeMs;
    if (LAST === 0) {
        return false;
    }

    const RAW_DELTA_SECONDS = (timeMs - LAST) / 1000;
    const DELTA_SECONDS = Math.min(FRAME_DT_CAP, RAW_DELTA_SECONDS);

    maybeSpawn(state, DELTA_SECONDS, bounds);
    step(state, DELTA_SECONDS, bounds);

    return true;
}

function maybeSpawn(
    state: BackgroundSimulationState,
    deltaSeconds: number,
    bounds: Bounds,
): void {
    state.spawnAccumulatorMs += deltaSeconds * 1000;

    if (state.spawnAccumulatorMs < SPAWN_INTERVAL_MS) {
        return;
    }

    state.spawnAccumulatorMs = 0;

    const EXISTING = state.bodies.length;
    if (EXISTING >= MAX_ACTIVE_OBJECTS) {
        return;
    }

    // Spawn a random count proportional to remaining capacity so population
    // grows smoothly as the scene fills.
    const CAPACITY = MAX_ACTIVE_OBJECTS - EXISTING;
    const TARGET = Math.ceil(CAPACITY * Math.random());

    for (let i = 0; i < TARGET; i += 1) {
        state.bodies.push(spawnBody(state, bounds));
    }
}

function randomAngle(): number {
    return Math.random() * Math.PI * 2;
}

function spawnBody(state: BackgroundSimulationState, bounds: Bounds): Body {
    const INDEX = Math.floor(Math.random() * BACKGROUND_SPRITES.length);
    const RADIUS = bodyRadius(INDEX);

    const MIN_X = bounds.left + RADIUS;
    const MAX_X = bounds.right - RADIUS;
    const X_RANGE = Math.max(1, MAX_X - MIN_X);

    const NEXT_ID = state.nextId;
    state.nextId += 1;

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

function step(
    state: BackgroundSimulationState,
    deltaSeconds: number,
    bounds: Bounds,
): void {
    state.timeSeconds += deltaSeconds;
    const NOW = state.timeSeconds;

    integrate(state, deltaSeconds, bounds, NOW);
    resolveAllCollisions(state);
    despawn(state, bounds);
}

function integrate(
    state: BackgroundSimulationState,
    deltaSeconds: number,
    bounds: Bounds,
    now: number,
): void {
    // Uses semi-implicit Euler integration:
    // velocity is updated first, then position from updated velocity.
    const LEFT_EDGE_BASE = bounds.left;
    const RIGHT_EDGE_BASE = bounds.right;

    for (const BODY of state.bodies) {
        const DRIFT = Math.sin(now + BODY.driftPhase) * BODY.driftForce;

        BODY.vx += DRIFT * deltaSeconds;
        BODY.vy += GRAVITY_PER_SECOND * deltaSeconds;

        BODY.x += BODY.vx * deltaSeconds;
        BODY.y += BODY.vy * deltaSeconds;

        if (BODY.x - BODY.radius < LEFT_EDGE_BASE) {
            BODY.x = LEFT_EDGE_BASE + BODY.radius;
            BODY.vx = -BODY.vx * WALL_BOUNCE;
        } else if (BODY.x + BODY.radius > RIGHT_EDGE_BASE) {
            BODY.x = RIGHT_EDGE_BASE - BODY.radius;
            BODY.vx = -BODY.vx * WALL_BOUNCE;
        }

        BODY.spin += BODY.spinVelocity * deltaSeconds;
    }
}

function resolveAllCollisions(state: BackgroundSimulationState): void {
    // Pairwise pass for O(n^2) collision checks. Fine for small n and keeps
    // collision behavior deterministic relative to body order.
    const BODIES = state.bodies;

    for (let i = 0; i < BODIES.length; i += 1) {
        const BODY_A = BODIES[i];
        if (!BODY_A) {
            continue;
        }
        for (let j = i + 1; j < BODIES.length; j += 1) {
            const BODY_B = BODIES[j];
            if (!BODY_B) {
                continue;
            }
            resolveCollision(BODY_A, BODY_B);
        }
    }
}

function despawn(state: BackgroundSimulationState, bounds: Bounds): void {
    // Keep bodies until their top edge passes below the despawn threshold,
    // so large sprites are not removed while still visible.
    const DESPAWN_EDGE = bounds.bottom + DESPAWN_BOTTOM_MARGIN;
    state.bodies = state.bodies.filter(
        (body) => body.y - body.radius < DESPAWN_EDGE,
    );
}

function randomRange(minimum: number, range: number): number {
    return minimum + Math.random() * range;
}

function resolveCollision(bodyA: Body, bodyB: Body): void {
    const DX = bodyB.x - bodyA.x;
    const DY = bodyB.y - bodyA.y;
    const DISTANCE = Math.sqrt(DX * DX + DY * DY);
    const MIN_DISTANCE = bodyA.radius + bodyB.radius;

    if (DISTANCE < MIN_DISTANCE) {
        // Normalize the collision vector
        const NX = DX / DISTANCE;
        const NY = DY / DISTANCE;

        // Relative velocity
        const VX_REL = bodyB.vx - bodyA.vx;
        const VY_REL = bodyB.vy - bodyA.vy;

        // Relative velocity in terms of the normal direction
        const VEL_ALONG_NORMAL = VX_REL * NX + VY_REL * NY;

        if (VEL_ALONG_NORMAL > 0) {
            return; // Bodies are moving apart, no need to resolve
        }

        // Calculate restitution and damping
        const RESTITUTION = COLLISION_RESTITUTION;
        const DAMPING = COLLISION_DAMPING;

        // Calculate impulse scalar
        const IMPULSE = -(1 + RESTITUTION) * VEL_ALONG_NORMAL;
        const IMPULSE_X = IMPULSE * NX;
        const IMPULSE_Y = IMPULSE * NY;

        // Apply impulse to the bodies
        bodyA.vx -= IMPULSE_X * DAMPING;
        bodyA.vy -= IMPULSE_Y * DAMPING;
        bodyB.vx += IMPULSE_X * DAMPING;
        bodyB.vy += IMPULSE_Y * DAMPING;

        // Positional correction to reduce overlap artifacts.
        const PERCENT = 0.2;
        const SLOP = 0.01;
        const CORRECTION_MAGNITUDE =
            Math.max(DISTANCE - MIN_DISTANCE, SLOP) / (1 / PERCENT);
        const CORRECTION_X = CORRECTION_MAGNITUDE * NX;
        const CORRECTION_Y = CORRECTION_MAGNITUDE * NY;

        bodyA.x -= CORRECTION_X;
        bodyA.y -= CORRECTION_Y;
        bodyB.x += CORRECTION_X;
        bodyB.y += CORRECTION_Y;
    }
}

function bodyRadius(index: number): number {
    const SPRITE = BACKGROUND_SPRITES[index];
    if (!SPRITE) {
        return 38;
    }
    const WIDTH = SPRITE.width * SPRITE_SCALE;
    const HEIGHT = SPRITE.height * SPRITE_SCALE;
    const DIAMETER = Math.min(WIDTH, HEIGHT);
    return DIAMETER / 2;
}
