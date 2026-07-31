/**
 * Drives the physical page-turn sequence on the landing page.
 */

const CODEX_SELECTOR = "[data-codex-scroll]";
const SCENE_SELECTOR = "[data-codex-scene]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const COMPLETE_TURN = 1;
const HALF_TURN = 0.5;
const MINIMUM_PROGRESS = 0;
const PAGE_TURN_DEGREES = -104;
const SCROLL_FRAME_THRESHOLD = 0;
const SHADOW_MULTIPLIER = 0.72;
const TURN_END = 0.9;
const TURN_START = 0.18;
const TURN_TRAVEL = TURN_END - TURN_START;

let animationFrame = SCROLL_FRAME_THRESHOLD;
let codexElement: HTMLElement | null = null;
let codexScenes: readonly HTMLElement[] = [];
let reducedMotion = false;

function clampProgress(value: number): number {
    return Math.min(COMPLETE_TURN, Math.max(MINIMUM_PROGRESS, value));
}

function sceneTurn(position: number, index: number): number {
    const RAW_TURN = position - index;

    if (RAW_TURN <= TURN_START) {
        return MINIMUM_PROGRESS;
    }

    if (RAW_TURN >= TURN_END) {
        return COMPLETE_TURN;
    }

    const LINEAR_PROGRESS = (RAW_TURN - TURN_START) / TURN_TRAVEL;

    return LINEAR_PROGRESS * LINEAR_PROGRESS * (3 - 2 * LINEAR_PROGRESS);
}

function visibleTurn(turn: number): number {
    if (!reducedMotion) {
        return turn;
    }

    if (turn < HALF_TURN) {
        return MINIMUM_PROGRESS;
    }

    return COMPLETE_TURN;
}

function updateScene(scene: HTMLElement, turn: number): void {
    const RENDERED_TURN = visibleTurn(turn);
    const ANGLE = RENDERED_TURN * PAGE_TURN_DEGREES;
    const SHADOW = Math.sin(RENDERED_TURN * Math.PI) * SHADOW_MULTIPLIER;
    let turnState = "visible";

    if (RENDERED_TURN === COMPLETE_TURN) {
        turnState = "turned";
    }

    scene.style.setProperty("--turn-angle", `${ANGLE}deg`);
    scene.style.setProperty("--turn-shadow", `${SHADOW}`);
    scene.style.setProperty("--turn-progress", `${RENDERED_TURN}`);
    scene.setAttribute("data-turn-state", turnState);
}

function codexProgress(): number {
    if (codexElement === null) {
        return MINIMUM_PROGRESS;
    }

    const BOUNDS = codexElement.getBoundingClientRect();
    const SCROLL_DISTANCE = codexElement.offsetHeight - globalThis.innerHeight;

    if (SCROLL_DISTANCE <= MINIMUM_PROGRESS) {
        return MINIMUM_PROGRESS;
    }

    return clampProgress(-BOUNDS.top / SCROLL_DISTANCE);
}

function renderCodexPosition(): void {
    animationFrame = SCROLL_FRAME_THRESHOLD;

    if (codexScenes.length === MINIMUM_PROGRESS) {
        return;
    }

    const LAST_SCENE_INDEX = codexScenes.length - COMPLETE_TURN;
    const POSITION = codexProgress() * LAST_SCENE_INDEX;

    codexScenes.forEach((scene, index) => {
        updateScene(scene, sceneTurn(POSITION, index));
    });
}

function requestCodexRender(): void {
    if (animationFrame !== SCROLL_FRAME_THRESHOLD) {
        return;
    }

    animationFrame = globalThis.requestAnimationFrame(renderCodexPosition);
}

/**
 * Finds and initializes the landing page codex when present.
 */
export function initializeCodex(): void {
    codexElement =
        globalThis.document.querySelector<HTMLElement>(CODEX_SELECTOR);

    if (codexElement === null) {
        return;
    }

    codexScenes = Array.from(
        codexElement.querySelectorAll<HTMLElement>(SCENE_SELECTOR),
    );
    reducedMotion = globalThis.matchMedia(REDUCED_MOTION_QUERY).matches;
    globalThis.addEventListener("resize", requestCodexRender, {
        passive: true,
    });
    globalThis.addEventListener("scroll", requestCodexRender, {
        passive: true,
    });
    renderCodexPosition();
}
