import type { Rgb } from "./today-background-color.ts";
import {
    brutalNormalize,
    dominantChromaFromPixels,
    hexToRgb,
    rgbToHex,
    samplesToPixels,
} from "./today-background-color.ts";

/**
 * Visual colors used by the Today screen background and transition layer.
 */
export interface TodayBackgroundTheme {
    /** Ambient color used by floating background elements. */
    ambientColor: string;
    /** Base canvas color applied to the screen content container. */
    canvasColor: string;
    /** Dominant extracted color retained for diagnostics and future UI use. */
    dominantColor: string;
    /** Identifies whether the theme came from cover sampling or fallback generation. */
    source: "cover" | "fallback";
}

interface NeoBrutalistFallback {
    ambientColor: string;
    canvasColor: string;
    dominantColor: string;
}

const COVER_SAMPLES_BY_TITLE: Readonly<Record<string, readonly Rgb[]>> = {
    "2666": [
        { b: 64, g: 70, r: 118 },
        { b: 92, g: 86, r: 138 },
        { b: 86, g: 94, r: 151 },
    ],
    "Anna Karenina": [
        { b: 109, g: 128, r: 177 },
        { b: 142, g: 148, r: 194 },
        { b: 136, g: 110, r: 167 },
    ],
    "Don Quixote": [
        { b: 58, g: 86, r: 196 },
        { b: 74, g: 99, r: 211 },
        { b: 64, g: 80, r: 173 },
    ],
    Ficciones: [
        { b: 128, g: 110, r: 78 },
        { b: 102, g: 124, r: 89 },
        { b: 140, g: 130, r: 100 },
    ],
    Hamlet: [
        { b: 68, g: 96, r: 47 },
        { b: 84, g: 108, r: 59 },
        { b: 49, g: 79, r: 40 },
    ],
    "Moby-Dick": [
        { b: 146, g: 138, r: 122 },
        { b: 160, g: 151, r: 132 },
        { b: 136, g: 126, r: 113 },
    ],
};

const NEO_BRUTALIST_FALLBACKS: readonly NeoBrutalistFallback[] = [
    {
        ambientColor: "#FF3D2E",
        canvasColor: "#FF6B60",
        dominantColor: "#FF3D2E",
    },
];

function hashString(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

function dominantForTitle(title: string): Rgb | null {
    const SAMPLES = COVER_SAMPLES_BY_TITLE[title];
    if (!SAMPLES || SAMPLES.length === 0) {
        return null;
    }
    return dominantChromaFromPixels(samplesToPixels(SAMPLES));
}

/**
 * Returns a deterministic fallback TodayBackgroundTheme for a given key.
 * @example
 * fallbackTheme("exampleKey")
 * { ambientColor: "#2E3DFF", canvasColor: "#2E3DFF", dominantColor: "#2E3DFF", source: "fallback" }
 * @param key - Input key used to deterministically select a fallback theme.
 * @returns Return object containing ambientColor, canvasColor, dominantColor and source set to "fallback".
 **/
function fallbackTheme(key: string): TodayBackgroundTheme {
    const INDEX = hashString(key) % NEO_BRUTALIST_FALLBACKS.length;
    const PICK = NEO_BRUTALIST_FALLBACKS[INDEX];
    if (!PICK) {
        const BRUTAL = brutalNormalize({ b: 46, g: 61, r: 255 });
        const HEX = rgbToHex(BRUTAL);
        return {
            ambientColor: HEX,
            canvasColor: HEX,
            dominantColor: HEX,
            source: "fallback",
        };
    }
    const BRUTAL = brutalNormalize(hexToRgb(PICK.dominantColor));
    const HEX = rgbToHex(BRUTAL);
    return {
        ambientColor: HEX,
        canvasColor: HEX,
        dominantColor: HEX,
        source: "fallback",
    };
}

/**
 * Generates a background theme for the "Today" screen based
 * on the title of the book and whether it has a cover image.
 * @param title - The title of the book
 * @param hasCover - A boolean indicating whether the book has a cover image
 * @returns A TodayBackgroundTheme object containing the ambient color, canvas color,
 * and dominant color for the background, as well as the source of the theme (either "cover" or "fallback").
 */
export function themeFromBook(
    title: string,
    hasCover: boolean,
): TodayBackgroundTheme {
    if (!hasCover) {
        return fallbackTheme(title);
    }

    const DOMINANT = dominantForTitle(title);
    if (!DOMINANT) {
        return fallbackTheme(title);
    }
    const BRUTAL_RGB = brutalNormalize(DOMINANT);
    const BRUTAL_HEX = rgbToHex(BRUTAL_RGB);

    return {
        ambientColor: BRUTAL_HEX,
        canvasColor: BRUTAL_HEX,
        dominantColor: BRUTAL_HEX,
        source: "cover",
    };
}
