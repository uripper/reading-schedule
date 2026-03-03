import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { BACKGROUND_SPRITES } from "./today_background_sprites";

const MAX_ACTIVE_OBJECTS = 15;
const SPAWN_INTERVAL_MS = 1000;
const BURST_TWO_PROBABILITY = 0.25;
const BURST_THREE_PROBABILITY = 0.13;
const SPRITE_SCALE = .52;
const HORIZONTAL_PADDING = -5;
const TOP_SPAWN_Y = -120;
const GRAVITY_PER_SECOND = 150;
const WALL_BOUNCE = 0.7;
const COLLISION_RESTITUTION = 0.9;
const COLLISION_DAMPING = .92;
const FRAME_DT_CAP = 1 / 24;
const BLUR_LEVEL = 2;
const MIN_OPACITY = 0.85;
const OPACITY_RANGE = 0.08;
const DESPAWN_BOTTOM_MARGIN = 120;

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

    const IMPULSE = -(1 + COLLISION_RESTITUTION) * SPEED_ON_NORMAL / 2;
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

export function TodayBackground() {
    const { height, width } = useWindowDimensions();
    const [tick, setTick] = useState(0);
    const bodiesRef = useRef<Body[]>([]);
    const nextIdRef = useRef(1);
    const lastFrameTimeRef = useRef(0);
    const spawnAccumulatorMsRef = useRef(0);
    const simulationTimeRef = useRef(0);

    const SCREEN_BOTTOM = useMemo(() => height + 180, [height]);
    const SCREEN_LEFT = useMemo(() => HORIZONTAL_PADDING, []);
    const SCREEN_RIGHT = useMemo(() => width - HORIZONTAL_PADDING, [width]);
    const SPRITE_COUNT = BACKGROUND_SPRITES.length;

    useEffect(() => {
        bodiesRef.current = [];
        nextIdRef.current = 1;
        spawnAccumulatorMsRef.current = 0;
        lastFrameTimeRef.current = 0;
        simulationTimeRef.current = 0;
    }, [height, width]);

    useEffect(() => {
        let frameId = 0;

        function spawnBody(): Body {
            const INDEX = Math.floor(Math.random() * SPRITE_COUNT);
            const RADIUS = bodyRadius(INDEX);
            const MIN_X = SCREEN_LEFT + RADIUS;
            const MAX_X = SCREEN_RIGHT - RADIUS;
            const X_RANGE = Math.max(1, MAX_X - MIN_X);
            return {
                driftForce: randomRange(24, 56),
                driftPhase: Math.random() * Math.PI * 2,
                id: nextIdRef.current++,
                index: INDEX,
                opacity: MIN_OPACITY + Math.random() * OPACITY_RANGE,
                radius: RADIUS,
                spin: Math.random() * Math.PI * 2,
                spinVelocity: randomRange(-1.2, 2.4),
                vx: randomRange(-130, 260),
                vy: randomRange(18, 58),
                x: MIN_X + Math.random() * X_RANGE,
                y: TOP_SPAWN_Y - Math.random() * 60,
            };
        }

        function maybeSpawn(deltaSeconds: number): void {
            spawnAccumulatorMsRef.current += deltaSeconds * 1000;
            if (spawnAccumulatorMsRef.current < SPAWN_INTERVAL_MS) {
                return;
            }
            spawnAccumulatorMsRef.current = 0;

            const EXISTING = bodiesRef.current.length;
            if (EXISTING >= MAX_ACTIVE_OBJECTS) {
                return;
            }

            const CAPACITY = MAX_ACTIVE_OBJECTS - EXISTING;
            const TARGET_COUNT = Math.min(CAPACITY, spawnCountByChance());
            for (let i = 0; i < TARGET_COUNT; i += 1) {
                bodiesRef.current.push(spawnBody());
            }
        }

        function simulate(deltaSeconds: number): void {
            const BODIES = bodiesRef.current;
            simulationTimeRef.current += deltaSeconds;
            const NOW = simulationTimeRef.current;
            BODIES.forEach((body) => {
                const DRIFT = Math.sin(NOW + body.driftPhase) * body.driftForce;
                body.vx += DRIFT * deltaSeconds;
                body.vy += GRAVITY_PER_SECOND * deltaSeconds;
                body.x += body.vx * deltaSeconds;
                body.y += body.vy * deltaSeconds;
                body.spin += body.spinVelocity * deltaSeconds;

                const LEFT_EDGE = SCREEN_LEFT + body.radius;
                const RIGHT_EDGE = SCREEN_RIGHT - body.radius;
                if (body.x < LEFT_EDGE) {
                    body.x = LEFT_EDGE;
                    body.vx = Math.abs(body.vx) * WALL_BOUNCE;
                    body.spinVelocity += 0.3;
                }
                if (body.x > RIGHT_EDGE) {
                    body.x = RIGHT_EDGE;
                    body.vx = -Math.abs(body.vx) * WALL_BOUNCE;
                    body.spinVelocity -= 0.3;
                }

            });

            for (let i = 0; i < BODIES.length; i += 1) {
                for (let j = i + 1; j < BODIES.length; j += 1) {
                    const A = BODIES[i];
                    const B = BODIES[j];
                    if (!A || !B) {
                        continue;
                    }
                    resolveCollision(A, B);
                }
            }

            const DESPAWN_EDGE = SCREEN_BOTTOM + DESPAWN_BOTTOM_MARGIN;
            bodiesRef.current = BODIES.filter((body) => {
                return body.y - body.radius < DESPAWN_EDGE;
            });
        }

        function frame(timeMs: number): void {
            const LAST = lastFrameTimeRef.current;
            lastFrameTimeRef.current = timeMs;
            if (LAST === 0) {
                frameId = requestAnimationFrame(frame);
                return;
            }

            const RAW_DT = (timeMs - LAST) / 1000;
            const DT = Math.min(FRAME_DT_CAP, RAW_DT);
            maybeSpawn(DT);
            simulate(DT);
            setTick((current) => current + 1);
            frameId = requestAnimationFrame(frame);
        }

        frameId = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(frameId);
    }, [SCREEN_BOTTOM, SCREEN_LEFT, SCREEN_RIGHT, SPRITE_COUNT]);

    return (
        <View pointerEvents="none" style={styles.layer}>
            {bodiesRef.current.map((body) => {
                const WIDTH = spriteWidth(body.index);
                const HEIGHT = spriteHeight(body.index);
                const SOURCE = BACKGROUND_SPRITES[body.index]?.source;
                if (!SOURCE) {
                    return null;
                }
                return (
                    <Image
                        blurRadius={BLUR_LEVEL}
                        key={`floating-bg-${body.id}`}
                        resizeMode="contain"
                        source={SOURCE}
                        style={[
                            styles.sprite,
                            {
                                height: HEIGHT,
                                left: body.x - WIDTH / 2,
                                opacity: body.opacity,
                                top: body.y - HEIGHT / 2,
                                transform: [{ rotate: `${body.spin}rad` }],
                                width: WIDTH,
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    layer: {
        ...StyleSheet.absoluteFillObject,
        overflow: "visible",
    },
    sprite: {
        position: "absolute",
    },
});
