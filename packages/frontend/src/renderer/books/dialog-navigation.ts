import type { BookFormRefs } from "../../types/types.ts";

const NAV_ROOT_ID = "bookDialogNavigation";
const NAV_PREVIOUS_ID = "bookDialogPreviousBtn";
const NAV_NEXT_ID = "bookDialogNextBtn";
const NAV_STATUS_ID = "bookDialogNavigationStatus";
const PREVIOUS_DIRECTION = -1;
const NEXT_DIRECTION = 1;

export type BookDialogNavigationDirection = -1 | 1;

export interface BookDialogNavigationRefs {
    nextBtn: HTMLButtonElement;
    previousBtn: HTMLButtonElement;
    root: HTMLElement;
    status: HTMLElement;
}

function createNavigationButton(
    id: string,
    label: string,
    text: string,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.id = id;
    BUTTON.type = "button";
    BUTTON.className = "btn book-dialog-nav-btn";
    BUTTON.setAttribute("aria-label", label);
    BUTTON.textContent = text;
    return BUTTON;
}

function createNavigationRoot(): BookDialogNavigationRefs {
    const ROOT = document.createElement("div");
    ROOT.id = NAV_ROOT_ID;
    ROOT.className = "book-dialog-navigation";
    const PREVIOUS = createNavigationButton(
        NAV_PREVIOUS_ID,
        "Save and edit previous visible book",
        "<",
    );
    const STATUS = document.createElement("span");
    STATUS.id = NAV_STATUS_ID;
    STATUS.className = "book-dialog-nav-status";
    const NEXT = createNavigationButton(
        NAV_NEXT_ID,
        "Save and edit next visible book",
        ">",
    );
    ROOT.append(PREVIOUS, STATUS, NEXT);
    return { nextBtn: NEXT, previousBtn: PREVIOUS, root: ROOT, status: STATUS };
}

function existingNavigationRefs(): BookDialogNavigationRefs | null {
    const ROOT = document.getElementById(NAV_ROOT_ID);
    const PREVIOUS = document.getElementById(NAV_PREVIOUS_ID);
    const NEXT = document.getElementById(NAV_NEXT_ID);
    const STATUS = document.getElementById(NAV_STATUS_ID);
    if (
        ROOT instanceof HTMLElement &&
        PREVIOUS instanceof HTMLButtonElement &&
        NEXT instanceof HTMLButtonElement &&
        STATUS instanceof HTMLElement
    ) {
        return {
            nextBtn: NEXT,
            previousBtn: PREVIOUS,
            root: ROOT,
            status: STATUS,
        };
    }
    return null;
}

function insertNavigation(
    refs: BookFormRefs,
    navigation: BookDialogNavigationRefs,
): void {
    refs.dialogTitle.insertAdjacentElement("afterend", navigation.root);
}

function navigationStatusText(index: number, total: number): string {
    return `${index + 1} of ${total}`;
}

export function wrappedBookDialogIndex(
    bookIds: string[],
    currentBookId: string,
    direction: BookDialogNavigationDirection,
): number {
    const CURRENT_INDEX = bookIds.indexOf(currentBookId);
    if (CURRENT_INDEX < 0 || bookIds.length === 0) {
        return -1;
    }
    return (CURRENT_INDEX + direction + bookIds.length) % bookIds.length;
}

export function ensureBookDialogNavigation(
    refs: BookFormRefs,
): BookDialogNavigationRefs {
    const EXISTING = existingNavigationRefs();
    if (EXISTING !== null) {
        return EXISTING;
    }
    const NAVIGATION = createNavigationRoot();
    insertNavigation(refs, NAVIGATION);
    return NAVIGATION;
}

export function updateBookDialogNavigation(
    refs: BookDialogNavigationRefs,
    bookIds: string[],
    currentBookId: string,
): void {
    const CURRENT_INDEX = bookIds.indexOf(currentBookId);
    const CAN_NAVIGATE = bookIds.length > 1 && CURRENT_INDEX >= 0;
    const ROOT = refs.root;
    const PREVIOUS_BTN = refs.previousBtn;
    const NEXT_BTN = refs.nextBtn;
    const STATUS = refs.status;
    ROOT.hidden = !CAN_NAVIGATE;
    PREVIOUS_BTN.disabled = !CAN_NAVIGATE;
    NEXT_BTN.disabled = !CAN_NAVIGATE;
    if (!CAN_NAVIGATE) {
        STATUS.textContent = "";
        return;
    }
    STATUS.textContent = navigationStatusText(CURRENT_INDEX, bookIds.length);
}

export function bindBookDialogNavigation(
    refs: BookDialogNavigationRefs,
    onNavigate: (direction: BookDialogNavigationDirection) => void,
): void {
    refs.previousBtn.addEventListener("click", () => {
        onNavigate(PREVIOUS_DIRECTION);
    });
    refs.nextBtn.addEventListener("click", () => {
        onNavigate(NEXT_DIRECTION);
    });
}
