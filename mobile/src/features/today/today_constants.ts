/**
 * BACKGROUND SIMULATION CONSTANTS
 */
// Frame timing
// Cap the delta time to prevent large jumps
// Lower values make motion more stable on laggy frames, but can look slower when frames are dropped.
export const FRAME_DT_CAP = 1 / 24;

// Spawn frequency and population
// Maximum number of objects to keep active at once
// Raise this for denser backgrounds; very high values can increase CPU/GPU cost.
export const MAX_ACTIVE_OBJECTS = 8;
// How long between spawns, in milliseconds
// Lower values spawn more often and make the scene fill faster.
export const SPAWN_INTERVAL_MS = 100;
// Chance of spawning 2 objects instead of 1
// Increase this to make double-spawns happen more often and the screen feel busier.
export const BURST_TWO_PROBABILITY = 0.25;
// Chance of spawning 3 objects instead of 1
// Increase this to create more frequent big bursts; too high can crowd the scene quickly.
export const BURST_THREE_PROBABILITY = 0.13;

// Rendering and placement
// Scale to apply to the sprite size
// Larger values make each sprite occupy more space and collide sooner.
export const SPRITE_SCALE = 0.52;
// Horizontal padding in pixels used to compute left/right bounce bounds
// Negative values let objects travel slightly off-screen before bouncing, positive values keep them farther inside.
export const HORIZONTAL_PADDING = -5;
// Starting Y position in pixels for newly spawned sprites
// More negative values spawn farther above the viewport, delaying visible entry.
export const TOP_SPAWN_Y = -120;

// Motion and collision
// Downward acceleration applied each frame, in pixels per second squared
// Higher values make objects speed up downward faster, lower values make the fall feel floatier.
export const GRAVITY_PER_SECOND = 30;
// Horizontal velocity multiplier applied when bouncing off side walls
// At 1.0 objects keep full horizontal speed on wall hits; below 1.0 they lose speed each bounce.
export const WALL_BOUNCE = 0.7;
// Collision restitution coefficient used in object-to-object collision response
// This controls bounciness between objects: higher means snappier rebounds, lower means softer collisions.
export const COLLISION_RESTITUTION = 0.9;
// Velocity damping multiplier applied after each object-to-object collision
// This removes some speed after collisions; lower values calm motion faster, higher values preserve energy.
export const COLLISION_DAMPING = 0.55;

// Visual styling
// How blurred the sprite should be, in pixels
// Increasing this softens details and can make motion feel more atmospheric.
export const BLUR_LEVEL = 2;
// The minimum opacity of the sprites
// Lower values fade all sprites more, helping foreground content stand out.
export const MIN_OPACITY = 0.85;
// The range of the opacity of the sprites, added on top of the minimum
// Actual opacity is MIN_OPACITY + random value in this range, so larger values increase visual variation.
export const OPACITY_RANGE = 0.08;

// Cleanup threshold
// The distance from the bottom of the screen at which to despawn the sprites
// Larger margins keep off-screen bodies alive longer, which can smooth exits but costs memory/CPU.
export const DESPAWN_BOTTOM_MARGIN = 120;

// Spawn randomization ranges
// Minimum horizontal drift force (px/s^2-like effect) applied to sinusoidal side motion.
export const DRIFT_FORCE_MIN = 24;
// Additional drift force range above DRIFT_FORCE_MIN.
export const DRIFT_FORCE_RANGE = 56;
// Minimum angular velocity (rad/s) used for sprite rotation.
export const SPIN_VELOCITY_MIN = -5.0;
// Additional angular velocity range above SPIN_VELOCITY_MIN.
export const SPIN_VELOCITY_RANGE = 10.0;
// Minimum initial horizontal velocity in px/s.
export const VX_MIN = -130;
// Additional horizontal velocity range above VX_MIN.
export const VX_RANGE = 520;
// Minimum initial vertical velocity in px/s.
export const VY_MIN = 2;
// Additional vertical velocity range above VY_MIN.
export const VY_RANGE = 50;
// Extra random distance above TOP_SPAWN_Y where new bodies can appear.
export const Y_SPAWN_RANGE = 60;

export const CAROUSEL_GAP = 16;
export const MIN_CAROUSEL_SIDE_INSET = 12;
export const THEME_TRANSITION_DURATION_MS = 700;

export const COVER_SOURCES: Record<string, number> = {
    "2666": require("../../../assets/book-covers/2666.jpg"),
    "Anna Karenina": require("../../../assets/book-covers/AnnaKarenina.jpg"),
    "Don Quixote": require("../../../assets/book-covers/DonQuixote.jpg"),
    Ficciones: require("../../../assets/book-covers/Ficciones.jpg"),
    Hamlet: require("../../../assets/book-covers/Hamlet.jpg"),
    "Moby-Dick": require("../../../assets/book-covers/MobyDick.jpg"),
};

export const DEFAULT_COVER_SOURCE = require("../../../assets/book-covers/Hamlet.jpg")