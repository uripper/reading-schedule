interface Rgb {
    b: number;
    g: number;
    r: number;
}

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

const LUMA_HIGH_CUTOFF = 0.92;
const LUMA_LOW_CUTOFF = 0.08;
const SATURATION_LOW_CUTOFF = 0.12;
const QUANTIZATION_STEP = 24;

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
    {
        ambientColor: "#FFE34A",
        canvasColor: "#FFE768",
        dominantColor: "#FFE34A",
    },
    {
        ambientColor: "#2C5BFF",
        canvasColor: "#5F83FF",
        dominantColor: "#2C5BFF",
    },
    {
        ambientColor: "#00D35E",
        canvasColor: "#3EEA83",
        dominantColor: "#00D35E",
    },
    {
        ambientColor: "#F7529C",
        canvasColor: "#FF73B2",
        dominantColor: "#F7529C",
    },
    {
        ambientColor: "#FF7C22",
        canvasColor: "#FF9A47",
        dominantColor: "#FF7C22",
    },
    {
        ambientColor: "#05C6D1",
        canvasColor: "#45D7E1",
        dominantColor: "#05C6D1",
    },
    {
        ambientColor: "#8CDD28",
        canvasColor: "#A9EB4D",
        dominantColor: "#8CDD28",
    },
    {
        ambientColor: "#FF4E00",
        canvasColor: "#FF7E40",
        dominantColor: "#FF4E00",
    },
    {
        ambientColor: "#FF235E",
        canvasColor: "#FF5A86",
        dominantColor: "#FF235E",
    },
];

function clampChannel(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > 255) {
        return 255;
    }
    return Math.round(value);
}

function rgbToHex(rgb: Rgb): string {
    const R = clampChannel(rgb.r).toString(16).padStart(2, "0");
    const G = clampChannel(rgb.g).toString(16).padStart(2, "0");
    const B = clampChannel(rgb.b).toString(16).padStart(2, "0");
    return `#${R}${G}${B}`.toUpperCase();
}

/**
* Convert an HSL color to an RGB color with channels in the 0–255 range.
* @example
* hslToRgb(0, 1, 0.5)
* { r: 255, g: 0, b: 0 }
* @param {{number}} h - Hue in degrees (0–360).
* @param {{number}} s - Saturation as a fraction (0–1).
* @param {{number}} l - Lightness as a fraction (0–1).
* @returns {{Rgb}} RGB color object with r, g, b channels clamped to 0–255.
**/
function hslToRgb(h: number, s: number, l: number): Rgb {
    const C = (1 - Math.abs(2 * l - 1)) * s;
    const H_PRIME = h / 60;
    const X = C * (1 - Math.abs((H_PRIME % 2) - 1));

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (H_PRIME >= 0 && H_PRIME < 1) {
        r1 = C;
        g1 = X;
    } else if (H_PRIME >= 1 && H_PRIME < 2) {
        r1 = X;
        g1 = C;
    } else if (H_PRIME >= 2 && H_PRIME < 3) {
        g1 = C;
        b1 = X;
    } else if (H_PRIME >= 3 && H_PRIME < 4) {
        g1 = X;
        b1 = C;
    } else if (H_PRIME >= 4 && H_PRIME < 5) {
        r1 = X;
        b1 = C;
    } else {
        r1 = C;
        b1 = X;
    }

    const M = l - C / 2;
    return {
        b: clampChannel((b1 + M) * 255),
        g: clampChannel((g1 + M) * 255),
        r: clampChannel((r1 + M) * 255),
    };
}

function hashString(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

/**
* Convert an RGB color (0-255) to HSL with hue in degrees and saturation/lightness in [0,1].
* @example
* rgbToHsl({ r: 255, g: 0, b: 0 })
* { h: 0, l: 0.5, s: 1 }
* @param {{Rgb}} {{rgb}} - RGB color with r, g, b components in the 0-255 range.
* @returns {{ h: number; l: number; s: number }} Return object with hue (degrees), lightness and saturation (0-1).
**/
function rgbToHsl(rgb: Rgb): { h: number; l: number; s: number } {
    const R = rgb.r / 255;
    const G = rgb.g / 255;
    const B = rgb.b / 255;

    const MAX = Math.max(R, G, B);
    const MIN = Math.min(R, G, B);
    const DELTA = MAX - MIN;

    let hue = 0;
    const LIGHTNESS = (MAX + MIN) / 2;
    let saturation = 0;
    if (DELTA !== 0) {
        saturation = DELTA / (1 - Math.abs(2 * LIGHTNESS - 1));
    }

    if (DELTA !== 0) {
        if (MAX === R) {
            hue = ((G - B) / DELTA) % 6;
        } else if (MAX === G) {
            hue = (B - R) / DELTA + 2;
        } else {
            hue = (R - G) / DELTA + 4;
        }
        hue = (hue * 60 + 360) % 360;
    }

    return { h: hue, l: LIGHTNESS, s: saturation };
}

function brutalNormalize(rgb: Rgb): Rgb {
    const { h: HUE } = rgbToHsl(rgb);
    return hslToRgb(HUE, 1, 0.5);
}

function luma(rgb: Rgb): number {
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function bucketKey(rgb: Rgb, step = QUANTIZATION_STEP): string {
    const R = clampChannel(Math.round(rgb.r / step) * step);
    const G = clampChannel(Math.round(rgb.g / step) * step);
    const B = clampChannel(Math.round(rgb.b / step) * step);
    return `${R},${G},${B}`;
}

function isInterestingPixel(rgb: Rgb): boolean {
    const LUMA = luma(rgb);
    if (LUMA < LUMA_LOW_CUTOFF || LUMA > LUMA_HIGH_CUTOFF) {
        return false;
    }
    const { s: SATURATION } = rgbToHsl(rgb);
    if (SATURATION < SATURATION_LOW_CUTOFF) {
        return false;
    }
    return true;
}

/**
 * Return the rgb color of the bucket with the highest count from a map of buckets.
 * @example
 * mostFrequentBucket(new Map([['bucket1', {count: 5, rgb: {r: 255, g: 0, b: 0}}]]))
 * { r: 255, g: 0, b: 0 }
 * @param {Map<string, {count: number, rgb: Rgb}>} counts - Map of bucket keys to objects containing a count and an rgb value.
 * @returns {Rgb|null} The rgb of the most frequent bucket, or null if no buckets are provided.
 */
function mostFrequentBucket(
    counts: Map<string, { count: number; rgb: Rgb }>,
): Rgb | null {
    let bestBucket: { count: number; rgb: Rgb } | null = null;
    for (const BUCKET of counts.values()) {
        if (!bestBucket || BUCKET.count > bestBucket.count) {
            bestBucket = BUCKET;
        }
    }
    if (!bestBucket) {
        return null;
    }
    return bestBucket.rgb;
}

/**
* Determine the dominant chroma (most frequent RGB bucket) from a flat RGBA pixel array.
* @example
* dominantChromaFromPixels(new Uint8ClampedArray([255,0,0,255, 0,255,0,255, 255,0,0,255]))
* { r: 255, g: 0, b: 0 }
* @param {{Uint8ClampedArray}} pixels - Flat RGBA pixel data where each pixel is four consecutive bytes.
* @returns {{Rgb | null}} The RGB color representing the most frequent chroma bucket among "interesting" pixels, or null if none found.
**/
function dominantChromaFromPixels(pixels: Uint8ClampedArray): Rgb | null {
    const COUNTS = new Map<string, { count: number; rgb: Rgb }>();

    for (let index = 0; index < pixels.length; index += 4) {
        const RGB: Rgb = {
            b: pixels[index + 2] ?? 0,
            g: pixels[index + 1] ?? 0,
            r: pixels[index] ?? 0,
        };
        if (!isInterestingPixel(RGB)) {
            continue;
        }

        const KEY = bucketKey(RGB);
        const PREVIOUS = COUNTS.get(KEY);
        if (PREVIOUS) {
            PREVIOUS.count += 1;
        } else {
            COUNTS.set(KEY, { count: 1, rgb: RGB });
        }
    }

    return mostFrequentBucket(COUNTS);
}

function samplesToPixels(samples: readonly Rgb[]): Uint8ClampedArray {
    const PIXELS = new Uint8ClampedArray(samples.length * 4);
    samples.forEach((rgb, index) => {
        const OFFSET = index * 4;
        PIXELS[OFFSET] = clampChannel(rgb.r);
        PIXELS[OFFSET + 1] = clampChannel(rgb.g);
        PIXELS[OFFSET + 2] = clampChannel(rgb.b);
        PIXELS[OFFSET + 3] = 255;
    });
    return PIXELS;
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
* @param {{string}} {{key}} - Input key used to deterministically select a fallback theme.
* @returns {{TodayBackgroundTheme}} Return object containing ambientColor, canvasColor, dominantColor and source set to "fallback".
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

function hexToRgb(hex: string): Rgb {
    const SANITIZED = hex.replace("#", "");
    const VALUE = Number.parseInt(SANITIZED, 16);
    return {
        b: VALUE & 255,
        g: (VALUE >> 8) & 255,
        r: (VALUE >> 16) & 255,
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
