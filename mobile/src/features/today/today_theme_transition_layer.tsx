import { Animated, StyleSheet, View } from "react-native";

const GRID_COLUMNS = 5;
const GRID_ROWS = 5;
const GRID_TILE_COUNT = GRID_COLUMNS * GRID_ROWS;
const GRID_TILE_INDEXES = Array.from(
    { length: GRID_TILE_COUNT },
    (_, index) => {
        return index;
    },
);

function tilePhase(index: number): number {
    const COLUMN = index % GRID_COLUMNS;
    const ROW = Math.floor(index / GRID_COLUMNS);
    const WAVE = (COLUMN * 2 + ROW * 3) % 7;
    return WAVE / 9;
}

interface TodayThemeTransitionLayerProps {
    fromColor: string;
    progress: Animated.Value;
    toColor: string;
}

function createLayerAnimations(progress: Animated.Value) {
    const FROM_OPACITY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });
    const TO_OPACITY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });
    const SWEEP_OPACITY = progress.interpolate({
        inputRange: [0, 0.14, 0.78, 1],
        outputRange: [0, 0.48, 0.14, 0],
    });
    const SWEEP_SHIFT = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-260, 260],
    });
    const PIPE_SWEEP_SHIFT = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-180, 220],
    });
    return {
        fromOpacity: FROM_OPACITY,
        pipeSweepShift: PIPE_SWEEP_SHIFT,
        sweepOpacity: SWEEP_OPACITY,
        sweepShift: SWEEP_SHIFT,
        toOpacity: TO_OPACITY,
    };
}

function tileLeft(index: number): `${number}%` {
    return `${(index % GRID_COLUMNS) * (100 / GRID_COLUMNS)}%`;
}

function tileTop(index: number): `${number}%` {
    return `${Math.floor(index / GRID_COLUMNS) * (100 / GRID_ROWS)}%`;
}

function renderDissolveTiles(progress: Animated.Value) {
    return GRID_TILE_INDEXES.map((tileIndex) => {
        const PHASE = tilePhase(tileIndex);
        const TILE_OPACITY = progress.interpolate({
            inputRange: [PHASE, PHASE + 0.12, PHASE + 0.24],
            outputRange: [0, 0.52, 0],
            extrapolate: "clamp",
        });
        return (
            <Animated.View
                key={`dissolve-tile-${tileIndex}`}
                style={[
                    STYLES.dissolveTile,
                    {
                        left: tileLeft(tileIndex),
                        opacity: TILE_OPACITY,
                        top: tileTop(tileIndex),
                    },
                ]}
            />
        );
    });
}

interface LayerFillProps {
    color: string;
    opacity: Animated.AnimatedInterpolation<number>;
}

function LayerFill({ color, opacity }: LayerFillProps) {
    return (
        <Animated.View
            style={[STYLES.fill, { backgroundColor: color, opacity }]}
        />
    );
}

interface SweepEffectsProps {
    pipeSweepShift: Animated.AnimatedInterpolation<number>;
    sweepOpacity: Animated.AnimatedInterpolation<number>;
    sweepShift: Animated.AnimatedInterpolation<number>;
}

function SweepEffects({
    pipeSweepShift,
    sweepOpacity,
    sweepShift,
}: SweepEffectsProps) {
    return (
        <>
            <Animated.View
                style={[
                    STYLES.scanBand,
                    {
                        opacity: sweepOpacity,
                        transform: [
                            { translateX: sweepShift },
                            { rotate: "-14deg" },
                        ],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.scanBandThin,
                    {
                        opacity: sweepOpacity,
                        transform: [
                            { translateX: sweepShift },
                            { rotate: "-14deg" },
                        ],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.pipeSweep,
                    {
                        opacity: sweepOpacity,
                        transform: [{ translateX: pipeSweepShift }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.pipeSweepVertical,
                    {
                        opacity: sweepOpacity,
                        transform: [{ translateY: pipeSweepShift }],
                    },
                ]}
            />
        </>
    );
}

/**
 * Renders a non-interactive animated color-transition overlay for the Today screen.
 * @param fromColor - Starting canvas color before transition.
 * @param progress - Shared transition progress animated value in range `[0, 1]`.
 * @param toColor - Target canvas color after transition.
 * @returns Layer containing sweep and tile effects blended between theme colors.
 */
export function TodayThemeTransitionLayer({
    fromColor,
    progress,
    toColor,
}: TodayThemeTransitionLayerProps) {
    const ANIMATIONS = createLayerAnimations(progress);

    return (
        <View pointerEvents="none" style={STYLES.layer}>
            <LayerFill color={fromColor} opacity={ANIMATIONS.fromOpacity} />
            <LayerFill color={toColor} opacity={ANIMATIONS.toOpacity} />
            <SweepEffects
                pipeSweepShift={ANIMATIONS.pipeSweepShift}
                sweepOpacity={ANIMATIONS.sweepOpacity}
                sweepShift={ANIMATIONS.sweepShift}
            />
            {renderDissolveTiles(progress)}
        </View>
    );
}
const STYLES = StyleSheet.create({
    dissolveTile: {
        backgroundColor: "rgba(255, 255, 255, 0.65)",
        borderColor: "rgba(0, 0, 0, 0.45)",
        borderWidth: 1,
        height: `${100 / GRID_ROWS}%`,
        position: "absolute",
        width: `${100 / GRID_COLUMNS}%`,
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
    },
    layer: {
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
    },
    pipeSweep: {
        backgroundColor: "rgba(255, 255, 255, 0.22)",
        height: 72,
        left: -180,
        position: "absolute",
        top: "48%",
        width: 220,
    },
    pipeSweepVertical: {
        backgroundColor: "rgba(0, 0, 0, 0.18)",
        height: 220,
        position: "absolute",
        right: "22%",
        top: -180,
        width: 48,
    },
    scanBand: {
        backgroundColor: "rgba(255, 255, 255, 0.45)",
        height: 160,
        left: -120,
        position: "absolute",
        top: "36%",
        width: 340,
    },
    scanBandThin: {
        backgroundColor: "rgba(0, 0, 0, 0.28)",
        height: 30,
        left: -96,
        position: "absolute",
        top: "57%",
        width: 290,
    },
});
