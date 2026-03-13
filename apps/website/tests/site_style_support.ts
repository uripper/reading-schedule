/**
 * Shared style and contrast helpers for website accessibility tests.
 */

import { readWebsiteFile } from "./site_render_support.js";

const DEFAULT_ALPHA = 1;
const FULL_HEX_LENGTH = 6;
const HEX_RADIX = 16;
const HEX_PREFIX_LENGTH = 1;
const RGB_DIVISOR = 255;
const SHORT_HEX_LENGTH = 3;
const SRGB_BREAKPOINT = 0.03928;
const VARIABLE_PATTERN = /^var\((--[a-z0-9-]+)\)$/;
const RGB_PATTERN =
    /^rgb\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*(?:\/\s*([0-9.]+)\s*)?\)$/;
const TOKEN_PATTERN = /(--[a-z0-9-]+):\s*([^;]+);/g;

export const MIN_LARGE_TEXT_CONTRAST = 3;
export const MIN_NORMAL_TEXT_CONTRAST = 4.5;

/**
 * Parses the website token file into a simple variable map.
 */
export function readStyleTokens(): Readonly<Record<string, string>> {
    const TOKENS_FILE = readWebsiteFile("src/styles/tokens.css");
    const TOKEN_MAP: Record<string, string> = {};

    for (const MATCH of TOKENS_FILE.matchAll(TOKEN_PATTERN)) {
        const TOKEN_NAME = MATCH[1];
        const TOKEN_VALUE = MATCH[2];

        if (TOKEN_NAME === undefined || TOKEN_VALUE === undefined) {
            throw new Error("Encountered malformed style token.");
        }

        TOKEN_MAP[TOKEN_NAME] = TOKEN_VALUE.trim();
    }

    return TOKEN_MAP;
}

function parseHexColor(value: string) {
    let rawValue = value.slice(HEX_PREFIX_LENGTH);

    if (rawValue.length === SHORT_HEX_LENGTH) {
        rawValue = rawValue
            .split("")
            .map((character) => `${character}${character}`)
            .join("");
    }

    if (rawValue.length !== FULL_HEX_LENGTH) {
        throw new Error(`Unsupported hex color: ${value}`);
    }

    const NUMERIC_VALUE = Number.parseInt(rawValue, HEX_RADIX);

    return {
        a: DEFAULT_ALPHA,
        b: NUMERIC_VALUE & 255,
        g: (NUMERIC_VALUE >> 8) & 255,
        r: (NUMERIC_VALUE >> 16) & 255,
    };
}

function parseRgbColor(value: string) {
    const MATCH = value.match(RGB_PATTERN);

    if (MATCH === null) {
        throw new Error(`Unsupported rgb color: ${value}`);
    }

    const ALPHA_VALUE = MATCH[4];
    let resolvedAlpha = DEFAULT_ALPHA;

    if (ALPHA_VALUE !== undefined) {
        resolvedAlpha = Number(ALPHA_VALUE);
    }

    return {
        a: resolvedAlpha,
        b: Number(MATCH[3]),
        g: Number(MATCH[2]),
        r: Number(MATCH[1]),
    };
}

function resolveColor(value: string, tokens: Readonly<Record<string, string>>) {
    const NORMALIZED_VALUE = value.trim();
    const VARIABLE_MATCH = NORMALIZED_VALUE.match(VARIABLE_PATTERN);

    if (VARIABLE_MATCH !== null) {
        const TOKEN_NAME = VARIABLE_MATCH[1];

        if (TOKEN_NAME === undefined) {
            throw new Error(`Malformed CSS variable: ${value}`);
        }

        const RESOLVED_VALUE = tokens[TOKEN_NAME];

        if (RESOLVED_VALUE === undefined) {
            throw new Error(`Missing token: ${TOKEN_NAME}`);
        }

        return resolveColor(RESOLVED_VALUE, tokens);
    }

    if (NORMALIZED_VALUE.startsWith("#")) {
        return parseHexColor(NORMALIZED_VALUE);
    }

    if (NORMALIZED_VALUE.startsWith("rgb(")) {
        return parseRgbColor(NORMALIZED_VALUE);
    }

    throw new Error(`Unsupported color expression: ${value}`);
}

function blendColor(
    foregroundColor: ReturnType<typeof resolveColor>,
    backgroundColor: ReturnType<typeof resolveColor>,
) {
    if (foregroundColor.a >= DEFAULT_ALPHA) {
        return foregroundColor;
    }

    const BACKGROUND_WEIGHT = DEFAULT_ALPHA - foregroundColor.a;

    return {
        a: DEFAULT_ALPHA,
        b:
            foregroundColor.b * foregroundColor.a +
            backgroundColor.b * BACKGROUND_WEIGHT,
        g:
            foregroundColor.g * foregroundColor.a +
            backgroundColor.g * BACKGROUND_WEIGHT,
        r:
            foregroundColor.r * foregroundColor.a +
            backgroundColor.r * BACKGROUND_WEIGHT,
    };
}

function compositeColor(
    foregroundColor: ReturnType<typeof resolveColor>,
    backgroundColor: ReturnType<typeof resolveColor>,
) {
    return {
        a: DEFAULT_ALPHA,
        b:
            foregroundColor.b * foregroundColor.a +
            backgroundColor.b * (DEFAULT_ALPHA - foregroundColor.a),
        g:
            foregroundColor.g * foregroundColor.a +
            backgroundColor.g * (DEFAULT_ALPHA - foregroundColor.a),
        r:
            foregroundColor.r * foregroundColor.a +
            backgroundColor.r * (DEFAULT_ALPHA - foregroundColor.a),
    };
}

function toLinearChannel(channel: number): number {
    const NORMALIZED_CHANNEL = channel / RGB_DIVISOR;

    if (NORMALIZED_CHANNEL <= SRGB_BREAKPOINT) {
        return NORMALIZED_CHANNEL / 12.92;
    }

    return ((NORMALIZED_CHANNEL + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: ReturnType<typeof resolveColor>): number {
    return (
        0.2126 * toLinearChannel(color.r) +
        0.7152 * toLinearChannel(color.g) +
        0.0722 * toLinearChannel(color.b)
    );
}

/**
 * Calculates the contrast ratio between two CSS color expressions.
 */
export function contrastRatio(
    foreground: string,
    background: string,
    tokens: Readonly<Record<string, string>>,
): number {
    const BACKGROUND_COLOR = resolveColor(background, tokens);
    const FOREGROUND_COLOR = blendColor(
        resolveColor(foreground, tokens),
        BACKGROUND_COLOR,
    );
    const FOREGROUND_LUMINANCE = relativeLuminance(FOREGROUND_COLOR);
    const BACKGROUND_LUMINANCE = relativeLuminance(BACKGROUND_COLOR);
    const LIGHTER_LUMINANCE = Math.max(
        FOREGROUND_LUMINANCE,
        BACKGROUND_LUMINANCE,
    );
    const DARKER_LUMINANCE = Math.min(
        FOREGROUND_LUMINANCE,
        BACKGROUND_LUMINANCE,
    );

    return (LIGHTER_LUMINANCE + 0.05) / (DARKER_LUMINANCE + 0.05);
}

/**
 * Calculates contrast after compositing layered backgrounds over a base.
 */
export function contrastRatioForLayers(
    foreground: string,
    backgroundLayers: readonly string[],
    tokens: Readonly<Record<string, string>>,
): number {
    if (backgroundLayers.length === 0) {
        throw new Error("Expected at least one background layer.");
    }

    const BASE_LAYER = backgroundLayers[backgroundLayers.length - 1];

    if (BASE_LAYER === undefined) {
        throw new Error("Missing base background layer.");
    }

    let resolvedBackground = resolveColor(BASE_LAYER, tokens);

    for (let index = backgroundLayers.length - 2; index >= 0; index -= 1) {
        const LAYER = backgroundLayers[index];

        if (LAYER === undefined) {
            throw new Error("Missing background layer.");
        }

        resolvedBackground = compositeColor(
            resolveColor(LAYER, tokens),
            resolvedBackground,
        );
    }

    const FOREGROUND_COLOR = blendColor(
        resolveColor(foreground, tokens),
        resolvedBackground,
    );
    const FOREGROUND_LUMINANCE = relativeLuminance(FOREGROUND_COLOR);
    const BACKGROUND_LUMINANCE = relativeLuminance(resolvedBackground);
    const LIGHTER_LUMINANCE = Math.max(
        FOREGROUND_LUMINANCE,
        BACKGROUND_LUMINANCE,
    );
    const DARKER_LUMINANCE = Math.min(
        FOREGROUND_LUMINANCE,
        BACKGROUND_LUMINANCE,
    );

    return (LIGHTER_LUMINANCE + 0.05) / (DARKER_LUMINANCE + 0.05);
}
