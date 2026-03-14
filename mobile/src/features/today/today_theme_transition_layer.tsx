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

interface SweepStyleArgs {
    opacity: Animated.AnimatedInterpolation<number>;
    shift: Animated.AnimatedInterpolation<number>;
}

function interpolateValues(
    progress: Animated.Value,
    inputRange: number[],
    outputRange: number[],
) {
    return progress.interpolate({ inputRange, outputRange });
}

/**
 * Create interpolated animation values for a theme transition layer.
 * @example
 * createLayerAnimations(progress)
 * { fromOpacity: Animated.AnimatedInterpolation, pipeSweepShift: Animated.AnimatedInterpolation, sweepOpacity: Animated.AnimatedInterpolation, sweepShift: Animated.AnimatedInterpolation, toOpacity: Animated.AnimatedInterpolation }
 * @param progress - Animated.Value used to drive interpolation for the layer transitions.
 * @returns Returns an object containing interpolated animation values for from/to opacity, sweep opacity/shift, and pipe sweep shift.
 **/
function createLayerAnimations(progress: Animated.Value) {
    return {
        fromOpacity: interpolateValues(progress, [0, 1], [1, 0]),
        pipeSweepShift: interpolateValues(progress, [0, 1], [-180, 220]),
        sweepOpacity: interpolateValues(
            progress,
            [0, 0.14, 0.78, 1],
            [0, 0.48, 0.14, 0],
        ),
        sweepShift: interpolateValues(progress, [0, 1], [-260, 260]),
        toOpacity: interpolateValues(progress, [0, 1], [0, 1]),
    };
}

function tileLeft(index: number): `${number}%` {
    return `${(index % GRID_COLUMNS) * (100 / GRID_COLUMNS)}%`;
}

function tileTop(index: number): `${number}%` {
    return `${Math.floor(index / GRID_COLUMNS) * (100 / GRID_ROWS)}%`;
}

/**
 * Render a grid of dissolve tiles whose opacities are interpolated from an animated progress value.
 * @example
 * renderDissolveTiles(progress)
 * [<Animated.View key="dissolve-tile-0" ... />, <Animated.View key="dissolve-tile-1" ... />, ...]
 * @param {Animated.Value} progress - Animated progress value driving each tile's opacity interpolation.
 * @returns {JSX.Element[]} Array of Animated.View elements positioned in a grid with interpolated opacity.
 **/
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

function diagonalSweepStyle({ opacity, shift }: SweepStyleArgs) {
    return {
        opacity,
        transform: [{ rotate: "-14deg" }, { translateX: shift }],
    };
}

function horizontalSweepStyle({ opacity, shift }: SweepStyleArgs) {
    return { opacity, transform: [{ translateX: shift }] };
}

function verticalSweepStyle({ opacity, shift }: SweepStyleArgs) {
    return { opacity, transform: [{ translateY: shift }] };
}

interface SweepEffectsProps {
    pipeSweepShift: Animated.AnimatedInterpolation<number>;
    sweepOpacity: Animated.AnimatedInterpolation<number>;
    sweepShift: Animated.AnimatedInterpolation<number>;
}

/**
 * Render sweeping animated overlay effects (scan bands and pipe sweeps) for the today theme transition layer.
 * @example
 * SweepEffects({ pipeSweepShift: new Animated.Value(0), sweepOpacity: new Animated.Value(0.5), sweepShift: new Animated.Value(10) })
 * <></>
 * @param props - Props object with Animated.Value entries: pipeSweepShift (horizontal/vertical shift), sweepOpacity (opacity), and sweepShift (diagonal band translateX).
 * @returns Return a React fragment containing multiple Animated.View sweep overlays.
 **/
function SweepEffects({
    pipeSweepShift,
    sweepOpacity,
    sweepShift,
}: SweepEffectsProps) {
    const DIAGONAL_SWEEP = diagonalSweepStyle({
        opacity: sweepOpacity,
        shift: sweepShift,
    });
    const PIPE_SWEEP = horizontalSweepStyle({
        opacity: sweepOpacity,
        shift: pipeSweepShift,
    });
    const VERTICAL_PIPE_SWEEP = verticalSweepStyle({
        opacity: sweepOpacity,
        shift: pipeSweepShift,
    });

    return (
        <>
            <Animated.View style={[STYLES.scanBand, DIAGONAL_SWEEP]} />
            <Animated.View style={[STYLES.scanBandThin, DIAGONAL_SWEEP]} />
            <Animated.View style={[STYLES.pipeSweep, PIPE_SWEEP]} />
            <Animated.View
                style={[STYLES.pipeSweepVertical, VERTICAL_PIPE_SWEEP]}
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
