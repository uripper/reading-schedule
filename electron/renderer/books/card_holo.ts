import { type HoloPointerVars } from "../../types/types.js";

const DEFAULT_POINTER_PERCENT = "50%";
const ACTIVE_HOLO = "1";
const BG_SHIFT_FACTOR = 0.35;
const PERCENT_SCALE = 100;
const MIN_PERCENT = 0;
const HALF_PERCENT = 50;
const MAX_PERCENT = 100;

/**
 * Returns a percent value clamped to [0, 100].
 * @param value Raw percent candidate.
 * @returns Clamped percent.
 */
function clampedPercent(value: number): number {
    let normalized = MIN_PERCENT;
    if (Number.isFinite(value)) {
        normalized = value;
    }
    if (normalized < MIN_PERCENT) {
        return MIN_PERCENT;
    }
    if (normalized > MAX_PERCENT) {
        return MAX_PERCENT;
    }
    return normalized;
}

/**
 * Formats numeric percent as CSS percentage string.
 * @param value Percent number.
 * @returns CSS percent text.
 */
function asPercent(value: number): string {
    const ROUNDED = Math.round(value * PERCENT_SCALE) / PERCENT_SCALE;
    return `${ROUNDED}%`;
}

/**
 * Resets all holo CSS variables to neutral defaults.
 * @param button Cover button.
 */
function defaultVars(button: HTMLButtonElement): void {
    button.style.setProperty("--pointer-x", DEFAULT_POINTER_PERCENT);
    button.style.setProperty("--pointer-y", DEFAULT_POINTER_PERCENT);
    button.style.setProperty("--bg-shift-x", DEFAULT_POINTER_PERCENT);
    button.style.setProperty("--bg-shift-y", DEFAULT_POINTER_PERCENT);
    button.style.removeProperty("--holo-active");
}

/**
 * Writes computed holo CSS variables onto target button.
 * @param button Cover button.
 * @param vars Computed CSS values.
 */
function applyVars(button: HTMLButtonElement, vars: HoloPointerVars): void {
    button.style.setProperty("--pointer-x", vars.pointerX);
    button.style.setProperty("--pointer-y", vars.pointerY);
    button.style.setProperty("--bg-shift-x", vars.bgShiftX);
    button.style.setProperty("--bg-shift-y", vars.bgShiftY);
}

/**
 * Computes pointer-driven CSS variable values for holo layers.
 * @param rect Cover-button bounding rect.
 * @param clientX Pointer client x-coordinate.
 * @param clientY Pointer client y-coordinate.
 * @returns CSS variable value object.
 */
export function holoVarsForPointer(
    rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
    clientX: number,
    clientY: number,
): HoloPointerVars {
    const WIDTH = Math.max(1, rect.width);
    const HEIGHT = Math.max(1, rect.height);
    const X_PERCENT = clampedPercent(
        ((clientX - rect.left) / WIDTH) * MAX_PERCENT,
    );
    const Y_PERCENT = clampedPercent(
        ((clientY - rect.top) / HEIGHT) * MAX_PERCENT,
    );
    const BG_SHIFT_X = clampedPercent(
        HALF_PERCENT + (X_PERCENT - HALF_PERCENT) * BG_SHIFT_FACTOR,
    );
    const BG_SHIFT_Y = clampedPercent(
        HALF_PERCENT + (Y_PERCENT - HALF_PERCENT) * BG_SHIFT_FACTOR,
    );
    return {
        bgShiftX: asPercent(BG_SHIFT_X),
        bgShiftY: asPercent(BG_SHIFT_Y),
        pointerX: asPercent(X_PERCENT),
        pointerY: asPercent(Y_PERCENT),
    };
}

/**
 * Binds pointer-reactive holo behavior for a cover button.
 * @param button Cover button with artwork.
 */
export function bindReadCardHolo(button: HTMLButtonElement): void {
    const TARGET_BUTTON = button;
    const ACTIVATE_FROM_POINT = (clientX: number, clientY: number): void => {
        TARGET_BUTTON.style.setProperty("--holo-active", ACTIVE_HOLO);
        const VARS = holoVarsForPointer(
            TARGET_BUTTON.getBoundingClientRect(),
            clientX,
            clientY,
        );
        applyVars(TARGET_BUTTON, VARS);
    };

    const ON_POINTER_MOVE = (event: PointerEvent): void => {
        ACTIVATE_FROM_POINT(event.clientX, event.clientY);
    };
    const ON_MOUSE_MOVE = (event: MouseEvent): void => {
        ACTIVATE_FROM_POINT(event.clientX, event.clientY);
    };
    const ON_LEAVE = (): void => {
        defaultVars(TARGET_BUTTON);
    };

    TARGET_BUTTON.onpointerenter = ON_POINTER_MOVE;
    TARGET_BUTTON.onpointermove = ON_POINTER_MOVE;
    TARGET_BUTTON.onpointerleave = ON_LEAVE;
    TARGET_BUTTON.onmouseenter = ON_MOUSE_MOVE;
    TARGET_BUTTON.onmousemove = ON_MOUSE_MOVE;
    TARGET_BUTTON.onmouseleave = ON_LEAVE;
    defaultVars(TARGET_BUTTON);
}
