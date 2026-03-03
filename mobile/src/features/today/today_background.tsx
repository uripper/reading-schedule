import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { BACKGROUND_SPRITES } from "./today_background_sprites";

const MAX_ACTIVE_OBJECTS = 15;
const SPAWN_INTERVAL_MS = 1000;
const BURST_TWO_PROBABILITY = 0.25;
const BURST_THREE_PROBABILITY = 0.13;
const SPRITE_SCALE = 0.52;
const HORIZONTAL_PADDING = -5;
const TOP_SPAWN_Y = -120;
const GRAVITY_PER_SECOND = 30;
const WALL_BOUNCE = 0.7;
const COLLISION_RESTITUTION = 0.9;
const COLLISION_DAMPING = 0.92;
const FRAME_DT_CAP = 1 / 24;
const BLUR_LEVEL = 2;
const MIN_OPACITY = 0.85;
const OPACITY_RANGE = 0.08;
const DESPAWN_BOTTOM_MARGIN = 120;

interface TodayBackgroundProps {
    ambientColor: string;
}

interface Body {
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

function randomRange(minimum: number, range: number): number {
    return minimum + Math.random() * range;
}

function bodyRadius(spriteIndex: number): number {
    const SPRITE = BACKGROUND_SPRITES[spriteIndex];
    if (!SPRITE) {
        return 38;
    }
    const WIDTH = SPRITE.width * SPRITE_SCALE;
    const HEIGHT = SPRITE.height * SPRITE_SCALE;
    const DIAMETER = Math.min(WIDTH, HEIGHT);
    return DIAMETER / 2;
}

function spriteWidth(spriteIndex: number): number {
    const SPRITE = BACKGROUND_SPRITES[spriteIndex];
    if (!SPRITE) {
        return 80;
    }
    return SPRITE.width * SPRITE_SCALE;
}

function spriteHeight(spriteIndex: number): number {
    const SPRITE = BACKGROUND_SPRITES[spriteIndex];
    if (!SPRITE) {
        return 80;
    }
    return SPRITE.height * SPRITE_SCALE;
}

function spawnCountByChance(): number {
    const CHANCE = Math.random();
    if (CHANCE < BURST_THREE_PROBABILITY) {
        return 3;
    }
    if (CHANCE < BURST_THREE_PROBABILITY + BURST_TWO_PROBABILITY) {
        return 2;
    }
    return 1;
}

function resolveCollision(a: Body, b: Body): void {
    const DX = b.x - a.x;
    const DY = b.y - a.y;
    const DISTANCE = Math.hypot(DX, DY);
    const MIN_DISTANCE = a.radius + b.radius;
    if (DISTANCE <= 0 || DISTANCE >= MIN_DISTANCE) {
        return;
    }

    const NX = DX / DISTANCE;
    const NY = DY / DISTANCE;
    const OVERLAP = MIN_DISTANCE - DISTANCE;
    const PUSH = OVERLAP / 2;

    a.x -= NX * PUSH;
    a.y -= NY * PUSH;
    b.x += NX * PUSH;
    b.y += NY * PUSH;

    const RELATIVE_VX = b.vx - a.vx;
    const RELATIVE_VY = b.vy - a.vy;
    const SPEED_ON_NORMAL = RELATIVE_VX * NX + RELATIVE_VY * NY;
    if (SPEED_ON_NORMAL >= 0) {
        return;
    }

    const IMPULSE = (-(1 + COLLISION_RESTITUTION) * SPEED_ON_NORMAL) / 2;
    a.vx -= IMPULSE * NX;
    a.vy -= IMPULSE * NY;
    b.vx += IMPULSE * NX;
    b.vy += IMPULSE * NY;

    a.vx *= COLLISION_DAMPING;
    a.vy *= COLLISION_DAMPING;
    b.vx *= COLLISION_DAMPING;
    b.vy *= COLLISION_DAMPING;

    const SPIN_TRANSFER = (a.vx - b.vx) * 0.008;
    a.spinVelocity += SPIN_TRANSFER;
    b.spinVelocity -= SPIN_TRANSFER;
}

/**
 * A background component for the "Today" screen that simulates
 * floating and spinning background objects.
 * @param ambientColor - The ambient color for the background
 * @returns A React component that renders the background with floating and spinning objects, 
 * using the specified ambient color.
 */
export function TodayBackground({ ambientColor }: TodayBackgroundProps) {
    const { height, width } = useWindowDimensions();
    const [, setTick] = useState(0);
    const bodiesRef = useRef<Body[]>([]);
    const nextIdRef = useRef(1);
    const lastFrameTimeRef = useRef(0);
    const spawnAccumulatorMsRef = useRef(0);
    const simulationTimeRef = useRef(0);

    const screenBottom = useMemo(() => height + 180, [height]);
    const screenLeft = useMemo(() => HORIZONTAL_PADDING, []);
    const screenRight = useMemo(() => width - HORIZONTAL_PADDING, [width]);

    useEffect(() => {
        bodiesRef.current = [];
        nextIdRef.current = 1;
        spawnAccumulatorMsRef.current = 0;
        lastFrameTimeRef.current = 0;
        simulationTimeRef.current = 0;
    }, []);

    useEffect(() => {
        let frameId = 0;

        function spawnBody(): Body {
            const index = Math.floor(Math.random() * BACKGROUND_SPRITES.length);
            const radius = bodyRadius(index);
            const minX = screenLeft + radius;
            const maxX = screenRight - radius;
            const xRange = Math.max(1, maxX - minX);
            return {
                driftForce: randomRange(24, 56),
                driftPhase: Math.random() * Math.PI * 2,
                id: nextIdRef.current++,
                index,
                opacity: MIN_OPACITY + Math.random() * OPACITY_RANGE,
                radius,
                spin: Math.random() * Math.PI * 2,
                spinVelocity: randomRange(-0.5, 0.5),
                vx: randomRange(-130, 260),
                vy: randomRange(18, 58),
                x: minX + Math.random() * xRange,
                y: TOP_SPAWN_Y - Math.random() * 60,
            };
        }

        function maybeSpawn(deltaSeconds: number): void {
            spawnAccumulatorMsRef.current += deltaSeconds * 1000;
            if (spawnAccumulatorMsRef.current < SPAWN_INTERVAL_MS) {
                return;
            }
            spawnAccumulatorMsRef.current = 0;

            const existing = bodiesRef.current.length;
            if (existing >= MAX_ACTIVE_OBJECTS) {
                return;
            }

            const capacity = MAX_ACTIVE_OBJECTS - existing;
            const targetCount = Math.min(capacity, spawnCountByChance());
            for (let i = 0; i < targetCount; i += 1) {
                bodiesRef.current.push(spawnBody());
            }
        }

        /**
         * Simulates the physics step for the background objects.
         * @param deltaSeconds - The time elapsed since the last frame, in seconds.
         */
        function simulate(deltaSeconds: number): void {
            const bodies = bodiesRef.current;
            simulationTimeRef.current += deltaSeconds;
            const now = simulationTimeRef.current;
            for (const body of bodies) {
                const drift = Math.sin(now + body.driftPhase) * body.driftForce;
                body.vx += drift * deltaSeconds;
                body.vy += GRAVITY_PER_SECOND * deltaSeconds;
                body.x += body.vx * deltaSeconds;
                body.y += body.vy * deltaSeconds;
                body.spin += body.spinVelocity * deltaSeconds;

                const leftEdge = screenLeft + body.radius;
                const rightEdge = screenRight - body.radius;
                if (body.x < leftEdge) {
                    body.x = leftEdge;
                    body.vx = Math.abs(body.vx) * WALL_BOUNCE;
                    body.spinVelocity += 0.3;
                }
                if (body.x > rightEdge) {
                    body.x = rightEdge;
                    body.vx = -Math.abs(body.vx) * WALL_BOUNCE;
                    body.spinVelocity -= 0.3;
                }
            }

            for (let i = 0; i < bodies.length; i += 1) {
                for (let j = i + 1; j < bodies.length; j += 1) {
                    const bodyA = bodies[i];
                    const bodyB = bodies[j];
                    if (!bodyA || !bodyB) {
                        continue;
                    }
                    resolveCollision(bodyA, bodyB);
                }
            }

            const despawnEdge = screenBottom + DESPAWN_BOTTOM_MARGIN;
            bodiesRef.current = bodies.filter((body) => {
                return body.y - body.radius < despawnEdge;
            });
        }

        function frame(timeMs: number): void {
            const last = lastFrameTimeRef.current;
            lastFrameTimeRef.current = timeMs;
            if (last === 0) {
                frameId = requestAnimationFrame(frame);
                return;
            }

            const rawDeltaSeconds = (timeMs - last) / 1000;
            const deltaSeconds = Math.min(FRAME_DT_CAP, rawDeltaSeconds);
            maybeSpawn(deltaSeconds);
            simulate(deltaSeconds);
            setTick((current) => current + 1);
            frameId = requestAnimationFrame(frame);
        }

        frameId = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(frameId);
    }, [screenBottom, screenLeft, screenRight]);

    return (
        <View pointerEvents="none" style={STYLES.layer}>
            <View
                style={[
                    STYLES.ambientOverlay,
                    { backgroundColor: ambientColor },
                ]}
            />
            {bodiesRef.current.map((body) => {
                const spriteWidthPx = spriteWidth(body.index);
                const spriteHeightPx = spriteHeight(body.index);
                const spriteSource = BACKGROUND_SPRITES[body.index]?.source;
                if (!spriteSource) {
                    return null;
                }
                return (
                    <Image
                        blurRadius={BLUR_LEVEL}
                        key={`floating-bg-${body.id}`}
                        resizeMode="contain"
                        source={spriteSource}
                        style={[
                            STYLES.sprite,
                            {
                                height: spriteHeightPx,
                                left: body.x - spriteWidthPx / 2,
                                opacity: body.opacity,
                                top: body.y - spriteHeightPx / 2,
                                transform: [{ rotate: `${body.spin}rad` }],
                                width: spriteWidthPx,
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const STYLES = StyleSheet.create({
    ambientOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.22,
    },
    layer: {
        ...StyleSheet.absoluteFillObject,
        overflow: "visible",
    },
    sprite: {
        position: "absolute",
    },
});
