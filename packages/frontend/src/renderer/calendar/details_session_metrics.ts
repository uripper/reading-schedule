/** Builds the label and value nodes shared by Schedule card metrics. */

/** Builds the first row of a metric. */
export function metricLabel(text: string): HTMLSpanElement {
    const LABEL = document.createElement("span");
    LABEL.className = "day-session-metric-label";
    LABEL.textContent = text;
    return LABEL;
}

/** Builds the second row of a metric. */
export function metricValue(text: string): HTMLElement {
    const VALUE = document.createElement("strong");
    VALUE.className = "day-session-metric-value";
    VALUE.textContent = text;
    return VALUE;
}

/** Builds a read-only labeled value. */
export function sessionMetric(label: string, value: string): HTMLElement {
    const METRIC = document.createElement("div");
    METRIC.className = "day-session-metric";
    METRIC.append(metricLabel(label), metricValue(value));
    return METRIC;
}
