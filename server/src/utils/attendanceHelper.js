/**
 * Shared Attendance & Date Helpers for Edusphere
 */

/**
 * Single shared helper for attendance percentage calculation.
 * Rule: 'late' counts as attended.
 * Formula: round(((present + late) / total) * 100, 1)
 */
function calcAttendancePercentage(present = 0, late = 0, total = 0) {
  const totalNum = Number(total) || 0;
  if (totalNum <= 0) return 0;
  const attended = (Number(present) || 0) + (Number(late) || 0);
  return Math.round((attended / totalNum) * 1000) / 10;
}

/**
 * Returns the current local date in YYYY-MM-DD format based on server's local clock
 * (e.g. IST UTC+5:30 or system time), avoiding UTC rollback bugs.
 */
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates whether a date string (YYYY-MM-DD) is in the future relative to server local date.
 */
function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const localToday = getLocalDateString();
  return dateStr > localToday;
}

module.exports = {
  calcAttendancePercentage,
  getLocalDateString,
  isFutureDate
};
