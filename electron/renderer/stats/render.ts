import type { BookStatus, StatsSnapshot } from "../../types/types.ts";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
    statusLabel,
} from "../books/status_catalog.ts";
import { el } from "../dom.ts";

const STATUS_ORDER: BookStatus[] = [
    BOOK_STATUS_TO_READ,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_DROPPED,
];
const SINGLE_FINISH_COUNT = 1;
const MIN_BAR_HEIGHT_PERCENT = 8;
const PERCENT_SCALE = 100;
const ZERO_COUNT = 0;

/**
 * Formats numeric values using locale-aware grouping.
 * @param value - Numeric value.
 * @returns Formatted number string.
 */
function numberText(value: number): string {
    return new Intl.NumberFormat().format(value);
}

/**
 * Builds a KPI card element for the stats dashboard.
 * @param title - Card title.
 * @param value - Emphasized value text.
 * @param note - Supporting context text.
 * @returns KPI card element.
 */
function card(title: string, value: string, note: string): HTMLElement {
    const NODE = document.createElement("article");
    NODE.className = "stats-card";

    const HEADING = document.createElement("h2");
    HEADING.textContent = title;

    const VALUE_NODE = document.createElement("p");
    VALUE_NODE.className = "stats-value";
    VALUE_NODE.textContent = value;

    const NOTE_NODE = document.createElement("p");
    NOTE_NODE.className = "stats-note";
    NOTE_NODE.textContent = note;

    NODE.append(HEADING, VALUE_NODE, NOTE_NODE);
    return NODE;
}

/**
 * Converts finish count to singular/plural label text.
 * @param count - Finish count.
 * @returns Human-friendly count label.
 */
function finishCountLabel(count: number): string {
    if (count === SINGLE_FINISH_COUNT) {
        return `${count} finish`;
    }
    return `${count} finishes`;
}

/**
 * Computes month-bar fill height percent with minimum visible non-zero size.
 * @param count - Count for month.
 * @param maxCount - Maximum count across months.
 * @returns Bar height percent.
 */
function barHeightPercent(count: number, maxCount: number): number {
    if (count <= ZERO_COUNT) {
        return ZERO_COUNT;
    }
    const SCALED = Math.round((count / maxCount) * PERCENT_SCALE);
    if (SCALED < MIN_BAR_HEIGHT_PERCENT) {
        return MIN_BAR_HEIGHT_PERCENT;
    }
    return SCALED;
}

function projectedFinishCard(snapshot: StatsSnapshot): HTMLElement {
    return card(
        `Projected Finishes ${snapshot.year}`,
        numberText(snapshot.projectedFinishCount),
        `${snapshot.plannedFinishCount} planned + ${snapshot.finishedThisYearCount} already read`,
    );
}

function completionRateCard(snapshot: StatsSnapshot): HTMLElement {
    return card(
        "Completion Rate",
        `${snapshot.completionRatePercent}%`,
        `${numberText(snapshot.completedSessionsToDate)} of ${numberText(snapshot.scheduledSessionsToDate)} sessions complete`,
    );
}

function readingMinutesCard(snapshot: StatsSnapshot): HTMLElement {
    return card(
        `Reading Minutes ${snapshot.year}`,
        numberText(snapshot.readingMinutesYear),
        `${numberText(snapshot.activeDaysYear)} active days, ${snapshot.currentStreakDays} day streak`,
    );
}

function catalogProgressCard(snapshot: StatsSnapshot): HTMLElement {
    return card(
        "Catalog Progress",
        `${snapshot.averageProgressPercent.toFixed(1)}%`,
        `${numberText(snapshot.booksStartedCount)} started across ${numberText(snapshot.totalBooks)} books`,
    );
}

function kpiCards(snapshot: StatsSnapshot): HTMLElement[] {
    return [
        projectedFinishCard(snapshot),
        completionRateCard(snapshot),
        readingMinutesCard(snapshot),
        catalogProgressCard(snapshot),
    ];
}

/**
 * Renders top-level KPI cards.
 * @param snapshot - Stats snapshot.
 * @returns KPI grid element.
 */
function kpiGrid(snapshot: StatsSnapshot): HTMLElement {
    const GRID = document.createElement("div");
    GRID.className = "stats-kpi-grid";
    GRID.append(...kpiCards(snapshot));
    return GRID;
}

function panelWithHeading(title: string): {
    heading: HTMLElement;
    panel: HTMLElement;
} {
    const PANEL = document.createElement("article");
    PANEL.className = "stats-panel";

    const HEADING = document.createElement("h1");
    HEADING.className = "stats-section-heading";
    HEADING.textContent = title;
    PANEL.append(HEADING);
    return { heading: HEADING, panel: PANEL };
}

function statusBarWrap(
    snapshot: StatsSnapshot,
    status: BookStatus,
    total: number,
): HTMLElement {
    const BAR_WRAP = document.createElement("div");
    BAR_WRAP.className = "status-bar-wrap";
    const BAR = document.createElement("span");
    BAR.className = `status-bar is-${status}`;
    const COUNT = snapshot.statusBreakdown[status];
    BAR.style.width = `${Math.round((COUNT / total) * 100)}%`;
    BAR_WRAP.append(BAR);
    return BAR_WRAP;
}

function statusCountNode(count: number): HTMLElement {
    const COUNT_NODE = document.createElement("span");
    COUNT_NODE.className = "status-count";
    COUNT_NODE.textContent = numberText(count);
    return COUNT_NODE;
}

function statusRow(
    snapshot: StatsSnapshot,
    status: BookStatus,
    total: number,
): HTMLElement {
    const ROW = document.createElement("div");
    ROW.className = "status-row";

    const LABEL = document.createElement("span");
    LABEL.className = "status-label";
    LABEL.textContent = statusLabel(status);
    const COUNT = snapshot.statusBreakdown[status];
    ROW.append(
        LABEL,
        statusBarWrap(snapshot, status, total),
        statusCountNode(COUNT),
    );
    return ROW;
}

function statusList(snapshot: StatsSnapshot): HTMLElement {
    const LIST = document.createElement("div");
    LIST.className = "status-list";
    const TOTAL = Math.max(1, snapshot.totalBooks);
    for (const STATUS of STATUS_ORDER) {
        LIST.append(statusRow(snapshot, STATUS, TOTAL));
    }
    return LIST;
}

/**
 * Renders book status distribution panel.
 * @param snapshot - Stats snapshot.
 * @returns Status panel element.
 */
function statusPanel(snapshot: StatsSnapshot): HTMLElement {
    const PANEL = panelWithHeading("Status Mix");
    PANEL.panel.append(statusList(snapshot));
    return PANEL.panel;
}

function monthTrack(count: number, maxCount: number): HTMLElement {
    const TRACK = document.createElement("div");
    TRACK.className = "month-bar-track";
    TRACK.tabIndex = 0;

    const FILL = document.createElement("span");
    FILL.className = "month-bar-fill";
    FILL.style.height = `${barHeightPercent(count, maxCount)}%`;
    FILL.setAttribute("title", finishCountLabel(count));
    if (count <= ZERO_COUNT) {
        FILL.classList.add("is-zero");
    }

    const VALUE_LABEL = document.createElement("span");
    VALUE_LABEL.className = "month-bar-value";
    VALUE_LABEL.textContent = finishCountLabel(count);
    TRACK.append(FILL, VALUE_LABEL);
    return TRACK;
}

function monthLabelNode(year: number, index: number): HTMLElement {
    const MONTH = document.createElement("span");
    MONTH.className = "month-bar-label";
    MONTH.textContent = new Intl.DateTimeFormat(undefined, {
        month: "short",
    }).format(new Date(year, index, 1));
    return MONTH;
}

function monthBarItem(options: {
    count: number;
    index: number;
    maxCount: number;
    year: number;
}): HTMLElement {
    const ITEM = document.createElement("div");
    ITEM.className = "month-bar-item";
    const MONTH = monthLabelNode(options.year, options.index);
    ITEM.setAttribute(
        "aria-label",
        `${MONTH.textContent}: ${finishCountLabel(options.count)}`,
    );
    ITEM.append(monthTrack(options.count, options.maxCount), MONTH);
    return ITEM;
}

function monthBars(snapshot: StatsSnapshot): HTMLElement {
    const BARS = document.createElement("div");
    BARS.className = "month-bars";
    const MAX_COUNT = Math.max(...snapshot.monthlyFinishes, 1);
    snapshot.monthlyFinishes.forEach((count: number, index: number) => {
        BARS.append(
            monthBarItem({
                count,
                index,
                maxCount: MAX_COUNT,
                year: snapshot.year,
            }),
        );
    });
    return BARS;
}

/**
 * Renders monthly finish timeline bar chart panel.
 * @param snapshot - Stats snapshot.
 * @returns Month timeline panel element.
 */
function monthPanel(snapshot: StatsSnapshot): HTMLElement {
    const PANEL = panelWithHeading(`Finish Timeline ${snapshot.year}`);
    PANEL.panel.append(monthBars(snapshot));
    return PANEL.panel;
}

/**
 * Renders secondary stats panels (status + monthly timeline).
 * @param snapshot - Stats snapshot.
 * @returns Secondary panel grid element.
 */
function secondaryGrid(snapshot: StatsSnapshot): HTMLElement {
    const GRID = document.createElement("div");
    GRID.className = "stats-secondary-grid";
    GRID.append(statusPanel(snapshot), monthPanel(snapshot));
    return GRID;
}

/**
 * Replaces the stats dashboard contents using latest computed snapshot.
 * @param snapshot - Stats snapshot.
 */
export function renderStatsDashboard(snapshot: StatsSnapshot): void {
    const ROOT = el("statsDashboard");
    if (!snapshot.totalBooks) {
        const EMPTY = document.createElement("p");
        EMPTY.className = "hint-text";
        EMPTY.textContent = "Add books to see long-term reading stats.";
        ROOT.replaceChildren(EMPTY);
        return;
    }
    ROOT.replaceChildren(kpiGrid(snapshot), secondaryGrid(snapshot));
}
