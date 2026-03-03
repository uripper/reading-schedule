import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import type { Body, Bounds } from "./today_background_simulation";
import { BackgroundSimulation } from "./today_background_simulation";
import { BACKGROUND_SPRITES } from "./today_background_sprites";
import {
    BLUR_LEVEL,
    HORIZONTAL_PADDING,
    SPRITE_SCALE,
} from "./today_constants";

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

function useTodayBackgroundBodies(bounds: Bounds): readonly Body[] {
    const [, forceTick] = useState(0);
    const simRef = useRef<BackgroundSimulation | null>(null);

    useEffect(() => {
        simRef.current = new BackgroundSimulation();
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
        sim.reset();

        let frameId = 0;
        
        const frame = (timeMs: number): void => {
            if (!sim){
                return;
            }
            const stepped = sim.tick(timeMs, bounds);
            if (stepped) {
                forceTick((t) => t + 1);
            }
            frameId = requestAnimationFrame(frame);
        }

        frameId = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(frameId);
    }, [bounds.bottom, bounds.left, bounds.right, bounds]);

    const sim = simRef.current;
    if (!sim) {
        return [];
    }

    return sim.getBodies();
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
