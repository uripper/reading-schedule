import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  statusLabel,
} from "../books/status.js";
import { el } from "../dom.js";
import type { BookStatus } from "../../types/types_books.js";
import type { StatsSnapshot } from "../../types/types_stats.js";

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
 * @param value Numeric value.
 * @returns Formatted number string.
 */
function numberText(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * Builds a KPI card element for the stats dashboard.
 * @param title Card title.
 * @param value Emphasized value text.
 * @param note Supporting context text.
 * @returns KPI card element.
 */
function card(title: string, value: string, note: string): HTMLElement {
  const node = document.createElement("article");
  node.className = "stats-card";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const valueNode = document.createElement("p");
  valueNode.className = "stats-value";
  valueNode.textContent = value;

  const noteNode = document.createElement("p");
  noteNode.className = "stats-note";
  noteNode.textContent = note;

  node.append(heading, valueNode, noteNode);
  return node;
}

/**
 * Converts finish count to singular/plural label text.
 * @param count Finish count.
 * @returns Human-friendly count label.
 */
export function finishCountLabel(count: number): string {
  if (count === SINGLE_FINISH_COUNT) {
    return `${count} finish`;
  }
  return `${count} finishes`;
}

/**
 * Computes month-bar fill height percent with minimum visible non-zero size.
 * @param count Count for month.
 * @param maxCount Maximum count across months.
 * @returns Bar height percent.
 */
export function barHeightPercent(count: number, maxCount: number): number {
  if (count <= ZERO_COUNT) {
    return ZERO_COUNT;
  }
  const scaled = Math.round((count / maxCount) * PERCENT_SCALE);
  if (scaled < MIN_BAR_HEIGHT_PERCENT) {
    return MIN_BAR_HEIGHT_PERCENT;
  }
  return scaled;
}

/**
 * Renders top-level KPI cards.
 * @param snapshot Stats snapshot.
 * @returns KPI grid element.
 */
function kpiGrid(snapshot: StatsSnapshot): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "stats-kpi-grid";
  grid.append(
    card(
      `Projected Finishes ${snapshot.year}`,
      numberText(snapshot.projectedFinishCount),
      `${snapshot.plannedFinishCount} planned + ${snapshot.finishedThisYearCount} already read`,
    ),
    card(
      "Completion Rate",
      `${snapshot.completionRatePercent}%`,
      `${numberText(snapshot.completedSessionsToDate)} of ${numberText(snapshot.scheduledSessionsToDate)} sessions complete`,
    ),
    card(
      `Reading Minutes ${snapshot.year}`,
      numberText(snapshot.readingMinutesYear),
      `${numberText(snapshot.activeDaysYear)} active days, ${snapshot.currentStreakDays} day streak`,
    ),
    card(
      "Catalog Progress",
      `${snapshot.averageProgressPercent.toFixed(1)}%`,
      `${numberText(snapshot.booksStartedCount)} started across ${numberText(snapshot.totalBooks)} books`,
    ),
  );
  return grid;
}

/**
 * Renders book status distribution panel.
 * @param snapshot Stats snapshot.
 * @returns Status panel element.
 */
function statusPanel(snapshot: StatsSnapshot): HTMLElement {
  const panel = document.createElement("article");
  panel.className = "stats-panel";

  const heading = document.createElement("h1");
  heading.className = "stats-section-heading";
  heading.textContent = "Status Mix";

  const list = document.createElement("div");
  list.className = "status-list";
  const total = Math.max(1, snapshot.totalBooks);

  STATUS_ORDER.forEach((status) => {
    const row = document.createElement("div");
    row.className = "status-row";

    const label = document.createElement("span");
    label.className = "status-label";
    label.textContent = statusLabel(status);

    const barWrap = document.createElement("div");
    barWrap.className = "status-bar-wrap";
    const bar = document.createElement("span");
    bar.className = `status-bar is-${status}`;
    const count = snapshot.statusBreakdown[status];
    const width = Math.round((count / total) * 100);
    bar.style.width = `${width}%`;
    barWrap.append(bar);

    const countNode = document.createElement("span");
    countNode.className = "status-count";
    countNode.textContent = numberText(count);

    row.append(label, barWrap, countNode);
    list.append(row);
  });

  panel.append(heading, list);
  return panel;
}

/**
 * Renders monthly finish timeline bar chart panel.
 * @param snapshot Stats snapshot.
 * @returns Month timeline panel element.
 */
function monthPanel(snapshot: StatsSnapshot): HTMLElement {
  const panel = document.createElement("article");
  panel.className = "stats-panel";

  const heading = document.createElement("h1");
  heading.className = "stats-section-heading";
  heading.textContent = `Finish Timeline ${snapshot.year}`;

  const bars = document.createElement("div");
  bars.className = "month-bars";
  const maxCount = Math.max(...snapshot.monthlyFinishes, 1);

  snapshot.monthlyFinishes.forEach((count: number, index: number) => {
    const item = document.createElement("div");
    item.className = "month-bar-item";

    const track = document.createElement("div");
    track.className = "month-bar-track";
    track.tabIndex = 0;

    const fill = document.createElement("span");
    fill.className = "month-bar-fill";
    const heightPercent = barHeightPercent(count, maxCount);
    fill.style.height = `${heightPercent}%`;
    fill.setAttribute("title", finishCountLabel(count));
    if (count <= ZERO_COUNT) {
      fill.classList.add("is-zero");
    }
    const valueLabel = document.createElement("span");
    valueLabel.className = "month-bar-value";
    valueLabel.textContent = finishCountLabel(count);
    track.append(fill, valueLabel);

    const month = document.createElement("span");
    month.className = "month-bar-label";
    month.textContent = new Intl.DateTimeFormat(undefined, {
      month: "short",
    }).format(new Date(snapshot.year, index, 1));

    item.setAttribute(
      "aria-label",
      `${month.textContent}: ${finishCountLabel(count)}`,
    );
    item.append(track, month);
    bars.append(item);
  });

  panel.append(heading, bars);
  return panel;
}

/**
 * Renders secondary stats panels (status + monthly timeline).
 * @param snapshot Stats snapshot.
 * @returns Secondary panel grid element.
 */
function secondaryGrid(snapshot: StatsSnapshot): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "stats-secondary-grid";
  grid.append(statusPanel(snapshot), monthPanel(snapshot));
  return grid;
}

/**
 * Replaces the stats dashboard contents using latest computed snapshot.
 * @param snapshot Stats snapshot.
 */
export function renderStatsDashboard(snapshot: StatsSnapshot): void {
  const root = el("statsDashboard");
  if (!snapshot.totalBooks) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "Add books to see long-term reading stats.";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(kpiGrid(snapshot), secondaryGrid(snapshot));
}
