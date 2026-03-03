import { BACKGROUND_SPRITES } from "./today_background_sprites";
import {
    COLLISION_DAMPING,
    COLLISION_RESTITUTION,
    DESPAWN_BOTTOM_MARGIN,
    DRIFT_FORCE_MIN,
    DRIFT_FORCE_RANGE,
    FRAME_DT_CAP,
    GRAVITY_PER_SECOND,
    HORIZONTAL_PADDING,
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
 *
 */
export interface Body {
    /**
     *
     */
    driftForce: number;
    /**
     *
     */
    driftPhase: number;
    /**
     *
     */
    id: number;
    /**
     *
     */
    index: number;
    /**
     *
     */
    opacity: number;
    /**
     *
     */
    radius: number;
    /**
     *
     */
    spin: number;
    /**
     *
     */
    spinVelocity: number;
    /**
     *
     */
    vx: number;
    /**
     *
     */
    vy: number;
    /**
     *
     */
    x: number;
    /**
     *
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
 * Runs a frame-based particle simulation for the Today background.
 *
 * Lifecycle:
 * 1. `tick(...)` advances time and applies frame time capping.
 * 2. New bodies are spawned on an interval up to `MAX_ACTIVE_OBJECTS`.
 * 3. Bodies are integrated with drift, gravity, wall bounces, and collisions.
 * 4. Bodies are removed after passing below the despawn edge.
 */
export class BackgroundSimulation {
    private bodies: Body[] = [];
    private nextId = 1;
    private lastFrameMs = 0;
    private spawnAccumulatorMs = 0;
    private timeSeconds = 0;

    /**
     * Clears all simulation state.
     *
     * Call this when dimensions/theme context changes and you want to restart
     * from an empty background with deterministic counters reset.
     */
    public reset(): void {
        this.bodies = [];
        this.nextId = 1;
        this.lastFrameMs = 0;
        this.spawnAccumulatorMs = 0;
        this.timeSeconds = 0;
    }

    /**
     * Returns the current immutable view of active bodies.
     * @returns An array of active bodies in the simulation.
     */
    public getBodies(): readonly Body[] {
        return this.bodies;
    }

    /**
     * Advances the simulation by one frame time.
     * @param timeMs - Current frame timestamp (from RAF), in milliseconds.
     * @param bounds - Active simulation boundaries.
     * @returns `false` on first frame (no delta yet), otherwise `true`.
     */
    public tick(timeMs: number, bounds: Bounds): boolean {
        const LAST = this.lastFrameMs;
        this.lastFrameMs = timeMs;
        if (LAST === 0) {
            return false;
        }

        const RAW_DELTA_SECONDS = (timeMs - LAST) / 1000;
        const DELTA_SECONDS = Math.min(FRAME_DT_CAP, RAW_DELTA_SECONDS);

        this.maybeSpawn(DELTA_SECONDS, bounds);
        this.step(DELTA_SECONDS, bounds);

        return true;
    }

    /**
     * Spawns one or more new bodies after enough simulated time has elapsed.
     * @param deltaSeconds - Time advanced this frame, in seconds.
     * @param bounds - Current horizontal spawn limits.
     */
    private maybeSpawn(deltaSeconds: number, bounds: Bounds): void {
        this.spawnAccumulatorMs += deltaSeconds * 1000;

        if (this.spawnAccumulatorMs < SPAWN_INTERVAL_MS) {
            return;
        }

        this.spawnAccumulatorMs = 0;

        const EXISTING = this.bodies.length;
        if (EXISTING >= MAX_ACTIVE_OBJECTS) {
            return;
        }

        // Extraction candidate: spawn burst strategy. This currently scales random
        // spawn count by free capacity; consider replacing with BURST probabilities
        // in today_constants for more predictable tuning.
        const CAPACITY = MAX_ACTIVE_OBJECTS - EXISTING;
        const TARGET = Math.ceil(CAPACITY * Math.random());

        for (let i = 0; i < TARGET; i++) {
            this.bodies.push(this.spawnBody(bounds));
        }
    }

    /**
     * Creates a uniformly random angle in radians within [0, 2pi).
     * @returns A random angle in radians.
     */
    private randomAngle(): number {
        return Math.random() * Math.PI * 2;
    }

    /**
     * Creates one body with randomized visual and motion properties.
     * @param bounds - Current simulation bounds used to constrain initial X.
     * @returns A new Body with random properties and a unique ID.
     */
    private spawnBody(bounds: Bounds): Body {
        const INDEX = Math.floor(Math.random() * BACKGROUND_SPRITES.length);
        const RADIUS = this.bodyRadius(INDEX);

        const MIN_X = bounds.left + RADIUS;
        const MAX_X = bounds.right - RADIUS;
        const X_RANGE = Math.max(1, MAX_X - MIN_X);

        const NEXT_ID = this.nextId++;

        return {
            driftForce: this.randomRange(DRIFT_FORCE_MIN, DRIFT_FORCE_RANGE),
            driftPhase: this.randomAngle(),
            id: NEXT_ID,
            index: INDEX,
            opacity: MIN_OPACITY + Math.random() * OPACITY_RANGE,
            radius: RADIUS,
            spin: this.randomAngle(),
            spinVelocity: this.randomRange(
                SPIN_VELOCITY_MIN,
                SPIN_VELOCITY_RANGE,
            ),
            vx: this.randomRange(VX_MIN, VX_RANGE),
            vy: this.randomRange(VY_MIN, VY_RANGE),
            x: MIN_X + Math.random() * X_RANGE,
            y: TOP_SPAWN_Y - Math.random() * Y_SPAWN_RANGE,
        };
    }

    /**
     * Runs a full simulation step: integrate movement, resolve collisions,
     * then remove bodies that have left the active viewport region.
     * @param deltaSeconds - Time advanced this frame, in seconds.
     * @param bounds - Current simulation bounds.
     */
    private step(deltaSeconds: number, bounds: Bounds): void {
        this.timeSeconds += deltaSeconds;
        const NOW = this.timeSeconds;

        this.integrate(deltaSeconds, bounds, NOW);
        this.resolveAllCollisions();
        this.despawn(bounds);
    }

    /**
     * Integrates velocity/position and resolves wall bounces for each body.
     * @param deltaSeconds - Time step in seconds.
     * @param bounds - Current simulation bounds.
     * @param now - Accumulated simulation time, used for sinusoidal drift.
     */
    private integrate(deltaSeconds: number, bounds: Bounds, now: number): void {
        // Uses semi-implicit Euler integration:
        // velocity is updated first, then position from updated velocity.
        const LEFT_EDGE_BASE = bounds.left;
        const RIGHT_EDGE_BASE = bounds.right;

        for (const BODY of this.bodies) {
            const DRIFT = Math.sin(now + BODY.driftPhase) * BODY.driftForce;

            BODY.vx += DRIFT * deltaSeconds;
            BODY.vy += GRAVITY_PER_SECOND * deltaSeconds;

            BODY.x += BODY.vx * deltaSeconds;
            BODY.y += BODY.vy * deltaSeconds;

            if (BODY.x - BODY.radius < LEFT_EDGE_BASE) {
                BODY.x = LEFT_EDGE_BASE + BODY.radius;
                BODY.vx = -BODY.vx * WALL_BOUNCE;
            } else if (
                BODY.x + BODY.radius >
                RIGHT_EDGE_BASE
            ) {
                BODY.x = RIGHT_EDGE_BASE - BODY.radius;
                BODY.vx = -BODY.vx * WALL_BOUNCE;
            }

            BODY.spin += BODY.spinVelocity * deltaSeconds;
        }
    }

    /**
     * Resolves pairwise body collisions for all active bodies.
     */
    private resolveAllCollisions(): void {
        // Pairwise pass for O(n^2) collision checks. Fine for small n and keeps
        // collision behavior deterministic relative to body order.
        const BODIES = this.bodies;

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
                this.resolveCollision(BODY_A, BODY_B);
            }
        }
    }

    /**
     * Removes bodies that have fallen beyond the configured despawn margin.
     * @param bounds - Current simulation bounds, including screen bottom.
     */
    private despawn(bounds: Bounds): void {
        // Keep bodies until their top edge passes below the despawn threshold,
        // so large sprites are not removed while still visible.
        const DESPAWN_EDGE = bounds.bottom + DESPAWN_BOTTOM_MARGIN;
        this.bodies = this.bodies.filter(
            (body) => body.y - body.radius < DESPAWN_EDGE,
        );
    }

    /**
     * Returns a random number in [minimum, minimum + range).
     * @param minimum - The lowest possible return value.
     * @param range - The size of the interval above minimum.
     * @returns A random number in the specified range.
     */
    private randomRange(minimum: number, range: number): number {
        return minimum + Math.random() * range;
    }

    private resolveCollision(bodyA: Body, bodyB: Body): void {
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

            // Positional correction to prevent sinking
            const PERCENT = 0.2; // usually 20% to 80%
            const SLOP = 0.01; // usually 0.01 to 0.1
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
    private bodyRadius(index: number): number {
        const SPRITE = BACKGROUND_SPRITES[index];
        if (!SPRITE) {
            return 38;
        }
        const WIDTH = SPRITE.width * SPRITE_SCALE;
        const HEIGHT = SPRITE.height * SPRITE_SCALE;
        const DIAMETER = Math.min(WIDTH, HEIGHT);
        return DIAMETER / 2;
    }
}
