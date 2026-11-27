/**
 * Keeps per-workspace plan settings read-only in the All Workspaces view.
 *
 * Reading Plan and Days Off belong to one workspace each; the merged view shows the
 * active workspace's values but cannot say which workspace an edit is meant for, so
 * those cards are inert there with a note pointing to the header selector. App-level
 * settings (Experience, the daily goal, Sync, Workspaces) stay editable everywhere.
 */
import {
    isViewingAllWorkspaces,
    onWorkspaceCatalogChanged,
} from "./workspace-store.ts";

const PLAN_SECTIONS = ["plan-budget", "days-off"];
const NOTE_CLASS = "workspace-plan-settings-note";
const NOTE_TEXT =
    "Plan settings belong to each workspace. Choose a workspace in the header selector to change them.";

/** Returns the section's note, creating it before the card on first use. */
function sectionNote(card: HTMLElement): HTMLElement {
    const EXISTING = card.previousElementSibling;
    if (
        EXISTING instanceof HTMLElement &&
        EXISTING.classList.contains(NOTE_CLASS)
    ) {
        return EXISTING;
    }
    const NOTE = document.createElement("p");
    NOTE.className = `hint-text ${NOTE_CLASS}`;
    NOTE.textContent = NOTE_TEXT;
    card.before(NOTE);
    return NOTE;
}

/** Locks or unlocks one plan card and shows its note only beside a visible card. */
function lockCard(card: HTMLElement, locked: boolean): void {
    const CARD = card;
    CARD.inert = locked;
    CARD.classList.toggle("is-workspace-locked", locked);
    const NOTE = sectionNote(CARD);
    const NOTE_HIDDEN = !locked || CARD.hidden;
    // Writing an unchanged `hidden` still notifies the observer, so skip no-ops.
    if (NOTE.hidden !== NOTE_HIDDEN) {
        NOTE.hidden = NOTE_HIDDEN;
    }
}

/** Locks or unlocks the plan cards for the current view. */
function applyLock(): void {
    const LOCKED = isViewingAllWorkspaces();
    for (const SECTION of PLAN_SECTIONS) {
        const CARD = document.querySelector<HTMLElement>(
            `[data-settings-section="${SECTION}"]`,
        );
        if (CARD !== null) {
            lockCard(CARD, LOCKED);
        }
    }
}

/** Keeps the plan cards in step with the shown view and the visible section. */
export function bindPlanSettingsLock(): void {
    applyLock();
    onWorkspaceCatalogChanged(applyLock);
    new MutationObserver(applyLock).observe(
        document.getElementById("tab-settings") ?? document.body,
        { attributeFilter: ["hidden"], attributes: true, subtree: true },
    );
}
