/**
 * Converts sampled background colors between RGB/HSL spaces and extracts a
 * dominant chromatic accent from pixel data for the mobile Today screen.
 */
interface Hsl {
    h: number;
    l: number;
    s: number;
}

/** Names the three hue channels used when reconstructing an RGB tuple. */
type HueChannelKey = "chroma" | "secondary" | "zero";

/** Orders the RGB channels for one sixth of the hue wheel. */
type HuePattern = readonly [HueChannelKey, HueChannelKey, HueChannelKey];

/** Tracks a quantized RGB bucket and the number of pixels assigned to it. */
interface BucketCount {
    count: number;
    rgb: Rgb;
}

/** Represents an RGB color using 8-bit channel values. */
export interface Rgb {
    b: number;
    g: number;
    r: number;
}

/** Converts hue degrees into one-sixth turns for HSL conversion math. */
const HSL_HUE_DIVISOR = 60;
/** Reuses the factor-two offset that shows up in HSL calculations. */
const HSL_LIGHTNESS_OFFSET = 2;
/** Maps each hue segment to the RGB channel ordering it should emit. */
const HUE_PATTERNS: readonly HuePattern[] = [
    ["chroma", "secondary", "zero"],
    ["secondary", "chroma", "zero"],
    ["zero", "chroma", "secondary"],
    ["zero", "secondary", "chroma"],
    ["secondary", "zero", "chroma"],
    ["chroma", "zero", "secondary"],
];
/** Represents a complete trip around the hue wheel. */
const FULL_CIRCLE_DEGREES = 360;
/** Forces brutal normalization to produce a fully saturated accent. */
const FULL_SATURATION = 1;
/** Filters out nearly white pixels when sampling dominant colors. */
const LUMA_HIGH_CUTOFF = 0.92;
/** Filters out nearly black pixels when sampling dominant colors. */
const LUMA_LOW_CUTOFF = 0.08;
/** Caps each RGB channel to the standard 8-bit maximum. */
const MAX_CHANNEL_VALUE = 255;
/** Centers brutal normalization at a mid-lightness accent color. */
const MID_LIGHTNESS = 0.5;
/** Writes fully opaque alpha values into synthesized pixel buffers. */
const OPAQUE_ALPHA = 255;
/** Steps across RGBA byte arrays one pixel at a time. */
const PIXEL_STRIDE = 4;
/** Groups nearby colors into coarse buckets when counting pixels. */
const QUANTIZATION_STEP = 24;
/** Rejects nearly grayscale pixels during chroma extraction. */
const SATURATION_LOW_CUTOFF = 0.12;

/** Clamps a numeric channel into the valid 8-bit RGB range. */
function clampChannel(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > MAX_CHANNEL_VALUE) {
        return MAX_CHANNEL_VALUE;
    }
    return Math.round(value);
}

/** Resolves one RGB channel value for the active hue-segment pattern. */
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

/** Builds normalized RGB channel values for an HSL hue segment. */
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

/** Computes the raw hue segment from a normalized RGB color. */
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

/** Converts a normalized RGB color to hue degrees. */
function hueDegrees(maxChannel: number, delta: number, rgb: Rgb): number {
    return (
        (hueFromRgb(maxChannel, delta, rgb) * HSL_HUE_DIVISOR +
            FULL_CIRCLE_DEGREES) %
        FULL_CIRCLE_DEGREES
    );
}

/** Normalizes 8-bit RGB channels into the 0..1 range used by HSL math. */
function normalizedRgb(rgb: Rgb): Rgb {
    return {
        b: rgb.b / MAX_CHANNEL_VALUE,
        g: rgb.g / MAX_CHANNEL_VALUE,
        r: rgb.r / MAX_CHANNEL_VALUE,
    };
}

/** Returns the most common quantized color bucket, if any were sampled. */
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

/** Increments the quantized bucket that corresponds to one sampled pixel. */
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

/** Reads one RGB triplet from an RGBA byte buffer. */
function pixelRgbAt(pixels: Uint8ClampedArray, index: number): Rgb {
    return {
        b: pixels[index + 2] ?? 0,
        g: pixels[index + 1] ?? 0,
        r: pixels[index] ?? 0,
    };
}

/** Computes perceived brightness for an RGB color. */
function luma(rgb: Rgb): number {
    return (
        (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / MAX_CHANNEL_VALUE
    );
}

/** Quantizes an RGB color into a stable bucket key for counting. */
function bucketKey(rgb: Rgb, step = QUANTIZATION_STEP): string {
    const R = clampChannel(Math.round(rgb.r / step) * step);
    const G = clampChannel(Math.round(rgb.g / step) * step);
    const B = clampChannel(Math.round(rgb.b / step) * step);
    return `${R},${G},${B}`;
}

/** Keeps only mid-luma, sufficiently saturated pixels for accent sampling. */
function isInterestingPixel(rgb: Rgb): boolean {
    const LUMA = luma(rgb);
    if (LUMA < LUMA_LOW_CUTOFF || LUMA > LUMA_HIGH_CUTOFF) {
        return false;
    }

    const { s: SATURATION } = rgbToHsl(rgb);
    return SATURATION >= SATURATION_LOW_CUTOFF;
}

/** Converts an RGB color into an uppercase hexadecimal string. */
export function rgbToHex(rgb: Rgb): string {
    const R = clampChannel(rgb.r).toString(16).padStart(2, "0");
    const G = clampChannel(rgb.g).toString(16).padStart(2, "0");
    const B = clampChannel(rgb.b).toString(16).padStart(2, "0");
    return `#${R}${G}${B}`.toUpperCase();
}

/** Converts an HSL color into an 8-bit RGB color. */
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

/** Converts an RGB color into HSL components. */
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

/** Converts any RGB color into a vivid mid-lightness accent with the same hue. */
export function brutalNormalize(rgb: Rgb): Rgb {
    const { h: HUE } = rgbToHsl(rgb);
    return hslToRgb(HUE, FULL_SATURATION, MID_LIGHTNESS);
}

/** Finds the dominant chromatic bucket in a sampled RGBA pixel buffer. */
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

/** Encodes RGB samples into an opaque RGBA pixel buffer. */
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

/** Parses a hexadecimal color string into an RGB color object. */
export function hexToRgb(hex: string): Rgb {
    const SANITIZED = hex.replace("#", "");
    const VALUE = Number.parseInt(SANITIZED, 16);
    return {
        b: VALUE & MAX_CHANNEL_VALUE,
        g: (VALUE >> 8) & MAX_CHANNEL_VALUE,
        r: (VALUE >> 16) & MAX_CHANNEL_VALUE,
    };
}
