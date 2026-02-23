const DEFAULT_POINTER_PERCENT = "50%";
const ACTIVE_HOLO = "1";
const INACTIVE_HOLO = "0";
const BG_SHIFT_FACTOR = 0.35;
const PERCENT_SCALE = 100;
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

const holoControllers = new Map<HTMLButtonElement, AbortController>();

interface HoloPointerVars {
  pointerX: string;
  pointerY: string;
  bgShiftX: string;
  bgShiftY: string;
}

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
  const rounded = Math.round(value * PERCENT_SCALE) / PERCENT_SCALE;
  return `${rounded}%`;
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
  button.style.setProperty("--holo-active", INACTIVE_HOLO);
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
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const xPercent = clampedPercent(((clientX - rect.left) / width) * MAX_PERCENT);
  const yPercent = clampedPercent(((clientY - rect.top) / height) * MAX_PERCENT);
  const bgShiftX = clampedPercent(50 + (xPercent - 50) * BG_SHIFT_FACTOR);
  const bgShiftY = clampedPercent(50 + (yPercent - 50) * BG_SHIFT_FACTOR);
  return {
    pointerX: asPercent(xPercent),
    pointerY: asPercent(yPercent),
    bgShiftX: asPercent(bgShiftX),
    bgShiftY: asPercent(bgShiftY),
  };
}

/**
 * Checks whether the device supports a fine primary pointer.
 * @returns `true` when pointer precision is fine.
 */
function hasFinePointer(): boolean {
  if (typeof globalThis.matchMedia !== "function") {
    return false;
  }
  return globalThis.matchMedia("(pointer:fine)").matches;
}

/**
 * Aborts stale bindings for buttons that are no longer connected.
 */
function pruneHoloBindings(): void {
  holoControllers.forEach((controller, button) => {
    if (button.isConnected) {
      return;
    }
    controller.abort();
    holoControllers.delete(button);
  });
}

/**
 * Binds pointer listeners to a single read-cover button.
 * @param button Read-card cover button.
 */
function bindHoloForButton(button: HTMLButtonElement): void {
  if (holoControllers.has(button)) {
    return;
  }
  const controller = new AbortController();
  const { signal } = controller;
  holoControllers.set(button, controller);
  defaultVars(button);
  const applyFromPointer = (event: PointerEvent): void => {
    const vars = holoVarsForPointer(button.getBoundingClientRect(), event.clientX, event.clientY);
    applyVars(button, vars);
  };
  button.addEventListener(
    "pointerenter",
    (event) => {
      button.style.setProperty("--holo-active", ACTIVE_HOLO);
      applyFromPointer(event);
    },
    { signal },
  );
  button.addEventListener(
    "pointermove",
    (event) => {
      applyFromPointer(event);
    },
    { signal },
  );
  button.addEventListener(
    "pointerleave",
    () => {
      defaultVars(button);
    },
    { signal },
  );
}

/**
 * Clears active bindings and resets vars for provided buttons.
 * @param buttons Buttons to clear.
 */
function clearBindingsForButtons(buttons: HTMLButtonElement[]): void {
  buttons.forEach((button) => {
    const existing = holoControllers.get(button);
    if (!existing) {
      return;
    }
    existing.abort();
    holoControllers.delete(button);
    defaultVars(button);
  });
}

/**
 * Binds pointer-reactive holo behavior for read-card cover buttons.
 * @param button Read-card cover button with real cover artwork.
 */
export function bindReadCardHolo(button: HTMLButtonElement): void {
  pruneHoloBindings();
  const buttons = [button];
  if (!hasFinePointer()) {
    clearBindingsForButtons(buttons);
    defaultVars(button);
    return;
  }
  bindHoloForButton(button);
}
