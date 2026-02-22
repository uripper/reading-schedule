/**
 * Converts Date fixture to `YYYY-MM-DD` key.
 * @param {Date} date Date fixture.
 * @returns {string} Day key text.
 */
function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow day key for plan-start-date tests.
 * @returns {string} Tomorrow day key.
 */
export function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey(tomorrow);
}
