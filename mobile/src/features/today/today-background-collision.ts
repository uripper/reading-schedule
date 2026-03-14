import { BACKGROUND_SPRITES } from "./today_background_sprites.ts";
import {
    COLLISION_DAMPING,
    COLLISION_RESTITUTION,
    SPRITE_SCALE,
} from "./today_constants.ts";
import type { Body } from "./today-background-simulation-types.ts";

const COLLISION_CORRECTION_PERCENT = 0.2;
const COLLISION_CORRECTION_SLOP = 0.01;
const DEFAULT_BODY_RADIUS = 38;
const FALLBACK_NORMAL_X = 1;
const FALLBACK_NORMAL_Y = 0;

interface CollisionGeometry {
    distance: number;
    minDistance: number;
    normalX: number;
    normalY: number;
}

interface CollisionImpulse {
    impulseX: number;
    impulseY: number;
}

export function bodyRadius(index: number): number {
    const SPRITE = BACKGROUND_SPRITES[index];
    if (!SPRITE) {
        return DEFAULT_BODY_RADIUS;
    }

    const WIDTH = SPRITE.width * SPRITE_SCALE;
    const HEIGHT = SPRITE.height * SPRITE_SCALE;
    return Math.min(WIDTH, HEIGHT) / 2;
}

export function resolveAllCollisions(bodies: readonly Body[]): void {
    for (const [INDEX, BODY] of bodies.entries()) {
        resolveCollisionsForBody(BODY, bodies, INDEX + 1);
    }
}

function resolveCollisionsForBody(
    body: Body,
    bodies: readonly Body[],
    startIndex: number,
): void {
    for (const OTHER_BODY of bodies.slice(startIndex)) {
        resolveCollision(body, OTHER_BODY);
    }
}

function resolveCollision(firstBody: Body, secondBody: Body): void {
    const GEOMETRY = collisionGeometry(firstBody, secondBody);
    if (!GEOMETRY) {
        return;
    }

    const IMPULSE = collisionImpulse(firstBody, secondBody, GEOMETRY);
    if (!IMPULSE) {
        return;
    }

    applyCollisionImpulse(firstBody, secondBody, IMPULSE);
    applySeparationCorrection(firstBody, secondBody, GEOMETRY);
}

function collisionGeometry(
    firstBody: Body,
    secondBody: Body,
): CollisionGeometry | null {
    const DELTA_X = secondBody.x - firstBody.x;
    const DELTA_Y = secondBody.y - firstBody.y;
    const MIN_DISTANCE = firstBody.radius + secondBody.radius;
    const DISTANCE_SQUARED = DELTA_X * DELTA_X + DELTA_Y * DELTA_Y;
    if (DISTANCE_SQUARED >= MIN_DISTANCE * MIN_DISTANCE) {
        return null;
    }

    if (DISTANCE_SQUARED === 0) {
        return {
            distance: 0,
            minDistance: MIN_DISTANCE,
            normalX: FALLBACK_NORMAL_X,
            normalY: FALLBACK_NORMAL_Y,
        };
    }

    const DISTANCE = Math.sqrt(DISTANCE_SQUARED);
    return {
        distance: DISTANCE,
        minDistance: MIN_DISTANCE,
        normalX: DELTA_X / DISTANCE,
        normalY: DELTA_Y / DISTANCE,
    };
}

function collisionImpulse(
    firstBody: Body,
    secondBody: Body,
    geometry: CollisionGeometry,
): CollisionImpulse | null {
    const RELATIVE_VELOCITY_X = secondBody.vx - firstBody.vx;
    const RELATIVE_VELOCITY_Y = secondBody.vy - firstBody.vy;
    const VELOCITY_ALONG_NORMAL =
        RELATIVE_VELOCITY_X * geometry.normalX +
        RELATIVE_VELOCITY_Y * geometry.normalY;
    if (VELOCITY_ALONG_NORMAL > 0) {
        return null;
    }

    const IMPULSE =
        -(1 + COLLISION_RESTITUTION) *
        VELOCITY_ALONG_NORMAL *
        COLLISION_DAMPING;
    return {
        impulseX: IMPULSE * geometry.normalX,
        impulseY: IMPULSE * geometry.normalY,
    };
}

function applyCollisionImpulse(
    firstBody: Body,
    secondBody: Body,
    impulse: CollisionImpulse,
): void {
    const FIRST = firstBody;
    const SECOND = secondBody;

    FIRST.vx -= impulse.impulseX;
    FIRST.vy -= impulse.impulseY;
    SECOND.vx += impulse.impulseX;
    SECOND.vy += impulse.impulseY;
}

function applySeparationCorrection(
    firstBody: Body,
    secondBody: Body,
    geometry: CollisionGeometry,
): void {
    const FIRST = firstBody;
    const SECOND = secondBody;
    const CORRECTION_MAGNITUDE =
        Math.max(
            geometry.distance - geometry.minDistance,
            COLLISION_CORRECTION_SLOP,
        ) /
        (1 / COLLISION_CORRECTION_PERCENT);
    const CORRECTION_X = CORRECTION_MAGNITUDE * geometry.normalX;
    const CORRECTION_Y = CORRECTION_MAGNITUDE * geometry.normalY;

    FIRST.x -= CORRECTION_X;
    FIRST.y -= CORRECTION_Y;
    SECOND.x += CORRECTION_X;
    SECOND.y += CORRECTION_Y;
}
