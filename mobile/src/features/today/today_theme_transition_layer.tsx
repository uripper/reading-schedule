import { Animated, StyleSheet, View } from "react-native";

const GRID_COLUMNS = 5;
const GRID_ROWS = 5;
const GRID_TILE_COUNT = GRID_COLUMNS * GRID_ROWS;

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

export function TodayThemeTransitionLayer({
    fromColor,
    progress,
    toColor,
}: TodayThemeTransitionLayerProps) {
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

    return (
        <View pointerEvents="none" style={STYLES.layer}>
            <Animated.View
                style={[
                    STYLES.fill,
                    { backgroundColor: fromColor, opacity: FROM_OPACITY },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.fill,
                    { backgroundColor: toColor, opacity: TO_OPACITY },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.scanBand,
                    {
                        opacity: SWEEP_OPACITY,
                        transform: [
                            { translateX: SWEEP_SHIFT },
                            { rotate: "-14deg" },
                        ],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.scanBandThin,
                    {
                        opacity: SWEEP_OPACITY,
                        transform: [
                            { translateX: SWEEP_SHIFT },
                            { rotate: "-14deg" },
                        ],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.pipeSweep,
                    {
                        opacity: SWEEP_OPACITY,
                        transform: [{ translateX: PIPE_SWEEP_SHIFT }],
                    },
                ]}
            />
            <Animated.View
                style={[
                    STYLES.pipeSweepVertical,
                    {
                        opacity: SWEEP_OPACITY,
                        transform: [{ translateY: PIPE_SWEEP_SHIFT }],
                    },
                ]}
            />
            {Array.from({ length: GRID_TILE_COUNT }).map((_, index) => {
                const PHASE = tilePhase(index);
                const TILE_OPACITY = progress.interpolate({
                    inputRange: [PHASE, PHASE + 0.12, PHASE + 0.24],
                    outputRange: [0, 0.52, 0],
                    extrapolate: "clamp",
                });
                const LEFT_PERCENT =
                    `${(index % GRID_COLUMNS) * (100 / GRID_COLUMNS)}%` as `${number}%`;
                const TOP_PERCENT =
                    `${Math.floor(index / GRID_COLUMNS) * (100 / GRID_ROWS)}%` as `${number}%`;
                return (
                    <Animated.View
                        key={`dissolve-tile-${index}`}
                        style={[
                            STYLES.dissolveTile,
                            {
                                left: LEFT_PERCENT,
                                opacity: TILE_OPACITY,
                                top: TOP_PERCENT,
                            },
                        ]}
                    />
                );
            })}
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
