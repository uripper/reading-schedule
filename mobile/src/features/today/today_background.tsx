import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import type {
    BackgroundSimulationState,
    Body,
    Bounds,
} from "./today_background_simulation.ts";
import {
    createBackgroundSimulationState,
    getBackgroundBodies,
    resetBackgroundSimulation,
    tickBackgroundSimulation,
} from "./today_background_simulation.ts";
import { BACKGROUND_SPRITES } from "./today_background_sprites.ts";
import {
    BLUR_LEVEL,
    HORIZONTAL_PADDING,
    SPRITE_SCALE,
} from "./today_constants.ts";

interface TodayBackgroundProps {
    ambientColor: string;
}

const BOTTOM_OFFSET_PX = 180;

function spriteWidthPx(index: number): number {
    const sprite = BACKGROUND_SPRITES[index];
    if (!sprite) {
        return 80;
    }
    return sprite.width * SPRITE_SCALE;
}

function spriteHeightPx(index: number): number {
    const sprite = BACKGROUND_SPRITES[index];
    if (!sprite) {
        return 80;
    }
    return sprite.height * SPRITE_SCALE;
}

function spriteSource(index: number): ImageSourcePropType | null {
    const sprite = BACKGROUND_SPRITES[index];
    if (!sprite?.source) {
        return null;
    }
    return sprite.source;
}

/**
 * Render a background sprite Image for a given body or return null if no sprite source.
 * @example
 * BackgroundSprite({ body: sampleBody })
 * <Image ... /> or null
 * @param {Body} body - Body object containing sprite index, position (x, y), opacity, and spin.
 * @returns {JSX.Element|null} Rendered Image component for the sprite or null when no source is available.
 **/
function BackgroundSprite({ body }: { body: Body }) {
    const source = spriteSource(body.index);
    if (!source) {
        return null;
    }

    const width = spriteWidthPx(body.index);
    const height = spriteHeightPx(body.index);

    return (
        <Image
            blurRadius={BLUR_LEVEL}
            resizeMode="contain"
            source={source}
            style={[
                STYLES.sprite,
                {
                    height,
                    left: body.x - width / 2,
                    opacity: body.opacity,
                    top: body.y - height / 2,
                    transform: [{ rotate: `${body.spin}rad` }],
                    width,
                },
            ]}
        />
    );
}

/**
 * Return the current list of background simulation bodies for the provided bounds and keep the simulation updated.
 * @example
 * useTodayBackgroundBodies({ bottom: 0, left: 0, right: 375 })
 * [ { /* Body */
function useTodayBackgroundBodies(bounds: Bounds): readonly Body[] {
    const [, forceTick] = useState(0);
    const simRef = useRef<BackgroundSimulationState | null>(null);

    useEffect(() => {
        simRef.current = createBackgroundSimulationState();
        return () => {
            simRef.current = null;
        };
    }, []);

    useEffect(() => {
        const sim = simRef.current;
        if (!sim) {
            return;
        }

        // Reset here so changing bounds doesn't produce a giant delta frame.
        resetBackgroundSimulation(sim);

        let frameId = 0;

        const frame = (timeMs: number): void => {
            if (!sim) {
                return;
            }
            const stepped = tickBackgroundSimulation(sim, timeMs, bounds);
            if (stepped) {
                forceTick((t) => t + 1);
            }
            frameId = requestAnimationFrame(frame);
        };

        frameId = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(frameId);
    }, [bounds.bottom, bounds.left, bounds.right, bounds]);

    const sim = simRef.current;
    if (!sim) {
        return [];
    }

    return getBackgroundBodies(sim);
}

/**
 * Floating/spinning background layer for the Today screen.
 * @returns A React element representing the background layer.
 */
export function TodayBackground({ ambientColor }: TodayBackgroundProps) {
    const { height, width } = useWindowDimensions();

    const bounds = useMemo<Bounds>(() => {
        return {
            bottom: height + BOTTOM_OFFSET_PX,
            left: HORIZONTAL_PADDING,
            right: width - HORIZONTAL_PADDING,
        };
    }, [height, width]);

    const bodies = useTodayBackgroundBodies(bounds);

    return (
        <View pointerEvents="none" style={STYLES.layer}>
            <View
                style={[
                    STYLES.ambientOverlay,
                    { backgroundColor: ambientColor },
                ]}
            />
            {bodies.map((body) => (
                <BackgroundSprite key={body.id} body={body} />
            ))}
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
