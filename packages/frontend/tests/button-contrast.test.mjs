/** Guards the enhanced text contrast of the shared action palette. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const BUTTONS_CSS = readFileSync(
    new URL("../styles/buttons.css", import.meta.url),
    "utf8",
);
const PALETTE_CSS = readFileSync(
    new URL("../styles/palette.css", import.meta.url),
    "utf8",
);
const ENHANCED_CONTRAST = 7;
const MAX_CHANNEL = 255;
const SHORT_HEX_LENGTH = 3;
const PERCENT_BASE = 100;
const CHANNEL_WEIGHTS = [0.2126, 0.7152, 0.0722];
const LUMINANCE_OFFSET = 0.05;
const HOVER_PERCENT = Number(
    BUTTONS_CSS.match(
        /--button-hover: color-mix\(in srgb, var\(--color-black\) (\d+)%, transparent\);/u,
    )?.[1],
);
const FILLS = [
    "blue",
    "blue-soft",
    "yellow",
    "remove",
    "confirm-remove",
    "gray",
    "replan",
    "completed",
];

function paletteName(token) {
    const PATTERN = new RegExp(
        `--button-${token}: var\\(--color-([a-z-]+)\\);`,
        "u",
    );
    const NAME = BUTTONS_CSS.match(PATTERN)?.[1];
    assert.ok(NAME, `Missing color token ${token}`);
    return NAME;
}

function channels(token) {
    const NAME = paletteName(token);
    const PATTERN = new RegExp(
        `--color-${NAME}: #([0-9a-f]{6}|[0-9a-f]{3});`,
        "u",
    );
    const HEX = PALETTE_CSS.match(PATTERN)?.[1];
    assert.ok(HEX, `Missing palette color ${NAME} for ${token}`);
    return Array.from(
        Buffer.from(expandShortHex(HEX), "hex"),
        (byte) => byte / MAX_CHANNEL,
    );
}

function expandShortHex(hex) {
    if (hex.length === SHORT_HEX_LENGTH) {
        return [...hex].map((digit) => digit + digit).join("");
    }
    return hex;
}

function linearize(channel) {
    if (channel <= 0.04045) {
        return channel / 12.92;
    }
    return ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(color, opacity = 1) {
    return color.reduce(
        (value, channel, index) =>
            value + CHANNEL_WEIGHTS[index] * linearize(channel * opacity),
        0,
    );
}

function assertContrast(text, fill) {
    const TEXT = luminance(channels(text));
    for (const OPACITY of [1, 1 - HOVER_PERCENT / PERCENT_BASE]) {
        const FILL = luminance(channels(fill), OPACITY);
        const RATIO =
            (Math.max(TEXT, FILL) + LUMINANCE_OFFSET) /
            (Math.min(TEXT, FILL) + LUMINANCE_OFFSET);
        assert.ok(
            RATIO >= ENHANCED_CONTRAST,
            `${text} on ${fill} is ${RATIO}:1`,
        );
    }
}

test("action labels reach 7:1 at rest and on hover", () => {
    for (const FILL of FILLS) {
        assertContrast("ink", FILL);
    }
    assertContrast("green-ink", "green");
});
