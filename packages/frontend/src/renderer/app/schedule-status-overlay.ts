const OVERLAY_ID = "scheduleStatusOverlay";
const HIDE_DELAY_MS = 3000;
const FADE_DURATION_MS = 220;

const MODE_CLASSES = ["is-updating", "is-updated", "is-failed", "is-hiding"];
const STATUS_FAILED_TEXT = "Schedule Update Failed";
const STATUS_UPDATED_TEXT = "Schedule Updated";
const STATUS_UPDATING_TEXT = "Updating Schedule";

interface OverlayNodes {
    icon: HTMLElement;
    root: HTMLElement;
    text: HTMLElement;
}

interface OverlayTimerState {
    finalizeTimer: ReturnType<typeof setTimeout> | null;
    hideTimer: ReturnType<typeof setTimeout> | null;
}

interface OverlayTerminalArgs {
    mode: string;
    nodes: OverlayNodes;
    state: OverlayTimerState;
    text: string;
}

export interface ScheduleStatusOverlay {
    showFailed(): void;
    showUpdated(): void;
    showUpdating(): void;
}

function appendOverlayNode(documentRef: Document): OverlayNodes {
    const Root = documentRef.createElement("div");
    const Icon = documentRef.createElement("span");
    const Text = documentRef.createElement("span");
    Root.id = OVERLAY_ID;
    Root.className = "schedule-status-overlay";
    Root.hidden = true;
    Root.setAttribute("aria-hidden", "true");
    Icon.className = "schedule-status-overlay-icon";
    Text.className = "schedule-status-overlay-text";
    Root.append(Icon, Text);
    documentRef.body.append(Root);
    return { icon: Icon, root: Root, text: Text };
}

function overlayNodes(documentRef: Document): OverlayNodes {
    const Existing = documentRef.getElementById(OVERLAY_ID);
    if (Existing instanceof HTMLElement) {
        const Icon = Existing.querySelector(".schedule-status-overlay-icon");
        const Text = Existing.querySelector(".schedule-status-overlay-text");
        if (Icon instanceof HTMLElement && Text instanceof HTMLElement) {
            return { icon: Icon, root: Existing, text: Text };
        }
    }
    return appendOverlayNode(documentRef);
}

function resetMode(root: HTMLElement): void {
    root.classList.remove(...MODE_CLASSES);
}

function showState(nodes: OverlayNodes, mode: string, text: string): void {
    const ROOT = nodes.root;
    const TEXT = nodes.text;
    resetMode(ROOT);
    ROOT.hidden = false;
    ROOT.classList.add(mode);
    TEXT.textContent = text;
}

function clearTimers(state: OverlayTimerState): void {
    const STATE = state;
    if (STATE.hideTimer !== null) {
        clearTimeout(STATE.hideTimer);
    }
    if (STATE.finalizeTimer !== null) {
        clearTimeout(STATE.finalizeTimer);
    }
    STATE.hideTimer = null;
    STATE.finalizeTimer = null;
}

function scheduleHide(nodes: OverlayNodes, state: OverlayTimerState): void {
    const NODES = nodes;
    const STATE = state;
    STATE.hideTimer = setTimeout(() => {
        NODES.root.classList.add("is-hiding");
        STATE.finalizeTimer = setTimeout(() => {
            NODES.root.hidden = true;
            resetMode(NODES.root);
        }, FADE_DURATION_MS);
    }, HIDE_DELAY_MS);
}

function showTerminal(args: OverlayTerminalArgs): void {
    clearTimers(args.state);
    showState(args.nodes, args.mode, args.text);
    scheduleHide(args.nodes, args.state);
}

export function createScheduleStatusOverlay(
    documentRef: Document = document,
): ScheduleStatusOverlay {
    const NODES = overlayNodes(documentRef);
    const STATE: OverlayTimerState = {
        finalizeTimer: null,
        hideTimer: null,
    };

    return {
        showFailed(): void {
            showTerminal({
                mode: "is-failed",
                nodes: NODES,
                state: STATE,
                text: STATUS_FAILED_TEXT,
            });
        },
        showUpdated(): void {
            showTerminal({
                mode: "is-updated",
                nodes: NODES,
                state: STATE,
                text: STATUS_UPDATED_TEXT,
            });
        },
        showUpdating(): void {
            clearTimers(STATE);
            showState(NODES, "is-updating", STATUS_UPDATING_TEXT);
        },
    };
}
