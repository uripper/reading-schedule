/**
 * A single drifting sprite in the Today background simulation.
 */
export interface Body {
    driftForce: number;
    driftPhase: number;
    id: number;
    index: number;
    opacity: number;
    radius: number;
    spin: number;
    spinVelocity: number;
    vx: number;
    vy: number;
    x: number;
    y: number;
}

/**
 * Horizontal bounds and despawn edge for the background simulation.
 */
export interface Bounds {
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
}

/**
 * Mutable container advanced by the background animation loop.
 */
export interface BackgroundSimulationState {
    bodies: Body[];
    lastFrameMs: number;
    nextId: number;
    spawnAccumulatorMs: number;
    timeSeconds: number;
}
