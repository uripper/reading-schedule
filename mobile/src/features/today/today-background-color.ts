interface Hsl {
    h: number;
    l: number;
    s: number;
}

type HueChannelKey = "chroma" | "secondary" | "zero";

type HuePattern = readonly [HueChannelKey, HueChannelKey, HueChannelKey];

interface BucketCount {
    count: number;
    rgb: Rgb;
}

export interface Rgb {
    b: number;
    g: number;
    r: number;
}

const HSL_HUE_DIVISOR = 60;
const HSL_LIGHTNESS_OFFSET = 2;
const HUE_PATTERNS: readonly HuePattern[] = [
    ["chroma", "secondary", "zero"],
    ["secondary", "chroma", "zero"],
    ["zero", "chroma", "secondary"],
    ["zero", "secondary", "chroma"],
    ["secondary", "zero", "chroma"],
    ["chroma", "zero", "secondary"],
];
const FULL_CIRCLE_DEGREES = 360;
const FULL_SATURATION = 1;
const LUMA_HIGH_CUTOFF = 0.92;
const LUMA_LOW_CUTOFF = 0.08;
const MAX_CHANNEL_VALUE = 255;
const MID_LIGHTNESS = 0.5;
const OPAQUE_ALPHA = 255;
const PIXEL_STRIDE = 4;
const QUANTIZATION_STEP = 24;
const SATURATION_LOW_CUTOFF = 0.12;

function clampChannel(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > MAX_CHANNEL_VALUE) {
        return MAX_CHANNEL_VALUE;
    }
    return Math.round(value);
}

function hueChannelValue(
    channel: HueChannelKey,
    chroma: number,
    secondary: number,
): number {
    if (channel === "chroma") {
        return chroma;
    }
    if (channel === "secondary") {
        return secondary;
    }
    return 0;
}

function hslChannels(huePrime: number, chroma: number, secondary: number): Rgb {
    const PATTERN = HUE_PATTERNS[Math.floor(huePrime) % HUE_PATTERNS.length];
    if (!PATTERN) {
        return { b: 0, g: 0, r: 0 };
    }

    return {
        b: hueChannelValue(PATTERN[2], chroma, secondary),
        g: hueChannelValue(PATTERN[1], chroma, secondary),
        r: hueChannelValue(PATTERN[0], chroma, secondary),
    };
}

function hueFromRgb(maxChannel: number, delta: number, rgb: Rgb): number {
    if (delta === 0) {
        return 0;
    }

    if (maxChannel === rgb.r) {
        return ((rgb.g - rgb.b) / delta) % HUE_PATTERNS.length;
    }
    if (maxChannel === rgb.g) {
        return (rgb.b - rgb.r) / delta + HSL_LIGHTNESS_OFFSET;
    }
    return (rgb.r - rgb.g) / delta + HSL_LIGHTNESS_OFFSET * 2;
}

function hueDegrees(maxChannel: number, delta: number, rgb: Rgb): number {
    return (
        (hueFromRgb(maxChannel, delta, rgb) * HSL_HUE_DIVISOR +
            FULL_CIRCLE_DEGREES) %
        FULL_CIRCLE_DEGREES
    );
}

function normalizedRgb(rgb: Rgb): Rgb {
    return {
        b: rgb.b / MAX_CHANNEL_VALUE,
        g: rgb.g / MAX_CHANNEL_VALUE,
        r: rgb.r / MAX_CHANNEL_VALUE,
    };
}

function mostFrequentBucket(counts: Map<string, BucketCount>): Rgb | null {
    let bestBucket: BucketCount | null = null;
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

function incrementBucketCount(
    counts: Map<string, BucketCount>,
    rgb: Rgb,
): void {
    const KEY = bucketKey(rgb);
    const PREVIOUS = counts.get(KEY);
    if (PREVIOUS) {
        PREVIOUS.count += 1;
        return;
    }

    counts.set(KEY, { count: 1, rgb });
}

function pixelRgbAt(pixels: Uint8ClampedArray, index: number): Rgb {
    return {
        b: pixels[index + 2] ?? 0,
        g: pixels[index + 1] ?? 0,
        r: pixels[index] ?? 0,
    };
}

function luma(rgb: Rgb): number {
    return (
        (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / MAX_CHANNEL_VALUE
    );
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
    return SATURATION >= SATURATION_LOW_CUTOFF;
}

export function rgbToHex(rgb: Rgb): string {
    const R = clampChannel(rgb.r).toString(16).padStart(2, "0");
    const G = clampChannel(rgb.g).toString(16).padStart(2, "0");
    const B = clampChannel(rgb.b).toString(16).padStart(2, "0");
    return `#${R}${G}${B}`.toUpperCase();
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
    const CHROMA = (1 - Math.abs(2 * l - 1)) * s;
    const HUE_PRIME = h / HSL_HUE_DIVISOR;
    const SECONDARY =
        CHROMA * (1 - Math.abs((HUE_PRIME % HSL_LIGHTNESS_OFFSET) - 1));
    const OFFSET = l - CHROMA / HSL_LIGHTNESS_OFFSET;
    const CHANNELS = hslChannels(HUE_PRIME, CHROMA, SECONDARY);

    return {
        b: clampChannel((CHANNELS.b + OFFSET) * MAX_CHANNEL_VALUE),
        g: clampChannel((CHANNELS.g + OFFSET) * MAX_CHANNEL_VALUE),
        r: clampChannel((CHANNELS.r + OFFSET) * MAX_CHANNEL_VALUE),
    };
}

export function rgbToHsl(rgb: Rgb): Hsl {
    const NORMALIZED_RGB = normalizedRgb(rgb);
    const MAX_CHANNEL = Math.max(
        NORMALIZED_RGB.r,
        NORMALIZED_RGB.g,
        NORMALIZED_RGB.b,
    );
    const MIN_CHANNEL = Math.min(
        NORMALIZED_RGB.r,
        NORMALIZED_RGB.g,
        NORMALIZED_RGB.b,
    );
    const DELTA = MAX_CHANNEL - MIN_CHANNEL;
    const LIGHTNESS = (MAX_CHANNEL + MIN_CHANNEL) / HSL_LIGHTNESS_OFFSET;
    let saturation = 0;
    if (DELTA !== 0) {
        saturation = DELTA / (1 - Math.abs(2 * LIGHTNESS - 1));
    }

    return {
        h: hueDegrees(MAX_CHANNEL, DELTA, NORMALIZED_RGB),
        l: LIGHTNESS,
        s: saturation,
    };
}

export function brutalNormalize(rgb: Rgb): Rgb {
    const { h: HUE } = rgbToHsl(rgb);
    return hslToRgb(HUE, FULL_SATURATION, MID_LIGHTNESS);
}

export function dominantChromaFromPixels(
    pixels: Uint8ClampedArray,
): Rgb | null {
    const COUNTS = new Map<string, BucketCount>();

    for (let index = 0; index < pixels.length; index += PIXEL_STRIDE) {
        const RGB = pixelRgbAt(pixels, index);
        if (isInterestingPixel(RGB)) {
            incrementBucketCount(COUNTS, RGB);
        }
    }

    return mostFrequentBucket(COUNTS);
}

export function samplesToPixels(samples: readonly Rgb[]): Uint8ClampedArray {
    const PIXELS = new Uint8ClampedArray(samples.length * PIXEL_STRIDE);

    samples.forEach((rgb, index) => {
        const OFFSET = index * PIXEL_STRIDE;
        PIXELS[OFFSET] = clampChannel(rgb.r);
        PIXELS[OFFSET + 1] = clampChannel(rgb.g);
        PIXELS[OFFSET + 2] = clampChannel(rgb.b);
        PIXELS[OFFSET + 3] = OPAQUE_ALPHA;
    });

    return PIXELS;
}

export function hexToRgb(hex: string): Rgb {
    const SANITIZED = hex.replace("#", "");
    const VALUE = Number.parseInt(SANITIZED, 16);
    return {
        b: VALUE & MAX_CHANNEL_VALUE,
        g: (VALUE >> 8) & MAX_CHANNEL_VALUE,
        r: (VALUE >> 16) & MAX_CHANNEL_VALUE,
    };
}
