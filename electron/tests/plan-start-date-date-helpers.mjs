/**
 * Converts Date fixture to `YYYY-MM-DD` key.
 * @param {Date} date - Date fixture.
 * @returns {string} Day key text.
 */
function dayKey(date) {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Returns tomorrow day key for plan-start-date tests.
 * @returns {string} Tomorrow day key.
 */
export function tomorrowKey() {
    const TOMORROW = new Date();
    TOMORROW.setDate(TOMORROW.getDate() + 1);
    return dayKey(TOMORROW);
}
