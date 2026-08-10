/**
 * All site work happens in Melbourne, so the calendar and daily views must
 * always operate on Melbourne time — even if a manager opens the app from a
 * device set to a different time zone (e.g. while travelling).
 */
export const APP_TIME_ZONE = "Australia/Melbourne";

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Extract the wall-clock date/time components of `date` as seen in `timeZone`. */
export function zonedParts(date, timeZone = APP_TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value || "00";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** "YYYY-MM-DD" for `date` as seen in `timeZone` (defaults to Melbourne). */
export function zonedISODate(date = new Date(), timeZone = APP_TIME_ZONE) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * Convert a wall-clock date/time in `timeZone` into the real UTC instant it
 * represents, correctly handling daylight saving.
 */
export function zonedDateToUTC(dateStr, timeStr = "00:00:00", timeZone = APP_TIME_ZONE) {
  const naive = new Date(`${dateStr}T${timeStr}`);
  const asUTC = new Date(naive.toLocaleString("en-US", { timeZone: "UTC" }));
  const asZone = new Date(naive.toLocaleString("en-US", { timeZone }));
  const diff = asUTC.getTime() - asZone.getTime();
  return new Date(naive.getTime() + diff);
}

/**
 * A Date object whose local getters (getDate/getHours/getDay/...) report the
 * current wall-clock time in `timeZone`, regardless of the device's own time
 * zone. Handy for calendar/day-grid navigation logic that only cares about
 * wall-clock values, not real elapsed time.
 */
export function zonedNow(timeZone = APP_TIME_ZONE) {
  return new Date(new Date().toLocaleString("en-US", { timeZone }));
}

/** Same trick as `zonedNow`, but for an arbitrary instant. */
export function toZonedLocal(date, timeZone = APP_TIME_ZONE) {
  return new Date(date.toLocaleString("en-US", { timeZone }));
}
