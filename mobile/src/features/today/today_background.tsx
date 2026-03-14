import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType, ImageStyle } from "react-native";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
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
import type {
    BackgroundSimulationState,
    Body,
    Bounds,
} from "./today-background-simulation-types.ts";

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

function spriteLayout(body: Body): ImageStyle {
    const width = spriteWidthPx(body.index);
    const height = spriteHeightPx(body.index);

    return {
        height,
        left: body.x - width / 2,
        opacity: body.opacity,
        top: body.y - height / 2,
        transform: [{ rotate: `${body.spin}rad` }],
        width,
    };
}

function BackgroundSprite({ body }: { body: Body }) {
    const source = spriteSource(body.index);
    if (!source) {
        return null;
    }

    return (
        <Image
            blurRadius={BLUR_LEVEL}
            resizeMode="contain"
            source={source}
            style={[STYLES.sprite, spriteLayout(body)]}
        />
    );
}

function useBackgroundSimulationRef(): MutableRefObject<BackgroundSimulationState | null> {
    const simulationRef = useRef<BackgroundSimulationState | null>(null);

    useEffect(() => {
        simulationRef.current = createBackgroundSimulationState();
        return () => {
            simulationRef.current = null;
        };
    }, []);

    return simulationRef;
}

interface BackgroundAnimationArgs {
    bounds: Bounds;
    forceTick: Dispatch<SetStateAction<number>>;
    simulation: BackgroundSimulationState;
}

function runBackgroundFrame(
    backgroundAnimationArgs: BackgroundAnimationArgs,
    timeMs: number,
): void {
    const stepped = tickBackgroundSimulation(
        backgroundAnimationArgs.simulation,
        timeMs,
        backgroundAnimationArgs.bounds,
    );
    if (stepped) {
        backgroundAnimationArgs.forceTick((tickCount) => tickCount + 1);
    }
}

function startBackgroundAnimation(
    backgroundAnimationArgs: BackgroundAnimationArgs,
): () => void {
    let frameId = 0;

    const frame = (timeMs: number): void => {
        runBackgroundFrame(backgroundAnimationArgs, timeMs);
        frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
}

function backgroundBodies(
    simulation: BackgroundSimulationState | null,
): readonly Body[] {
    if (!simulation) {
        return [];
    }
    return getBackgroundBodies(simulation);
}

function useTodayBackgroundBodies(bounds: Bounds): readonly Body[] {
    const [, forceTick] = useState(0);
    const simulationRef = useBackgroundSimulationRef();

    useEffect(() => {
        const simulation = simulationRef.current;
        if (!simulation) {
            return;
        }

        // Reset here so changing bounds doesn't produce a giant delta frame.
        resetBackgroundSimulation(simulation);
        return startBackgroundAnimation({
            bounds,
            forceTick,
            simulation,
        });
    }, [bounds.bottom, bounds.left, bounds.right, simulationRef]);

    return backgroundBodies(simulationRef.current);
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
