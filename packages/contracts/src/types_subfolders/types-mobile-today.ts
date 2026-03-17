/**
 * Mobile Today screen view-model and animation contracts.
 *
 * These types keep the mobile Today feature honest about the data it passes
 * between state loaders, screen components, and the decorative background
 * simulation. Keeping them here makes it easier to reuse the same shapes in
 * tests or future mobile/desktop shared presenters.
 */

/** Reading progress snapshot rendered by a single Today carousel card. */
export interface TodayBookCard {
    /** Accent color chosen for the card's visual treatment. */
    accent: string;
    /** Display author shown beneath the title. */
    author: string;
    /** Rounded completion percentage used by the progress meter. */
    completionPercent: number;
    /** Stable identifier used for list keys and selection. */
    id: string;
    /** Completed pages shown in the card progress summary. */
    pagesDone: number;
    /** Total page count used to contextualize progress. */
    pagesTotal: number;
    /** Book title displayed on the card. */
    title: string;
}

/** Small stats payload rendered beside the Today carousel. */
export interface TodayStats {
    /** Human-readable completed-session summary such as `1/3`. */
    completedSessions: string;
    /** Current reading streak in days. */
    dayStreak: number;
}

/** Complete view model consumed by the mobile Today screen. */
export interface TodayViewData {
    /** Prioritized book cards shown in the carousel. */
    books: TodayBookCard[];
    /** Headline metrics shown in the stats area. */
    stats: TodayStats;
}

/** Mutable particle-like sprite tracked by the Today background animation. */
export interface Body {
    /** Horizontal drift amplitude used for the floating motion. */
    driftForce: number;
    /** Phase offset that keeps bodies from drifting in sync. */
    driftPhase: number;
    /** Unique identifier used as a stable React key. */
    id: number;
    /** Sprite-sheet index used to pick the rendered image. */
    index: number;
    /** Current sprite opacity. */
    opacity: number;
    /** Collision radius derived from sprite dimensions. */
    radius: number;
    /** Current rotation in radians. */
    spin: number;
    /** Angular velocity applied on each animation step. */
    spinVelocity: number;
    /** Horizontal velocity. */
    vx: number;
    /** Vertical velocity. */
    vy: number;
    /** Horizontal position in pixels. */
    x: number;
    /** Vertical position in pixels. */
    y: number;
}

/** Horizontal and bottom bounds used by the background simulation. */
export interface Bounds {
    /** Lower despawn boundary in pixels. */
    readonly bottom: number;
    /** Left wall used for bounce resolution. */
    readonly left: number;
    /** Right wall used for bounce resolution. */
    readonly right: number;
}

/** Mutable simulation container advanced by the Today animation loop. */
export interface BackgroundSimulationState {
    /** Active floating bodies rendered on the screen. */
    bodies: Body[];
    /** Timestamp of the previous animation frame. */
    lastFrameMs: number;
    /** Next synthetic identifier assigned to a spawned body. */
    nextId: number;
    /** Spawn timer that decides when a new wave should appear. */
    spawnAccumulatorMs: number;
    /** Total simulated time used for drift calculations. */
    timeSeconds: number;
}
