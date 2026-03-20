// @ts-check
/**
 * Wall-clock math in IANA time zones using Intl (no extra deps).
 */

/** @typedef {{ year: number; month: number; day: number; hour: number; minute: number; second: number }} WallParts */

/**
 * Keys used for visible period widgets.
 * @typedef {"day"|"week"|"month"|"quarter"|"year"} WidgetKey
 */

/**
 * @param {number} epochMs
 * @param {string} timeZone
 * @returns {WallParts}
 */
export function getWallParts(epochMs, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  /** @type {Record<string, number>} */
  const acc = {};
  for (const { type, value } of dtf.formatToParts(new Date(epochMs))) {
    if (type === "literal") continue;
    acc[type] = Number(value);
  }
  return {
    year: acc.year,
    month: acc.month,
    day: acc.day,
    hour: acc.hour,
    minute: acc.minute,
    second: acc.second,
  };
}

/**
 * Compare wall A to B (year → second).
 * @param {WallParts} a
 * @param {WallParts} b
 * @returns {number}
 */
function cmpWall(a, b) {
  /** @type {(keyof WallParts)[]} */
  const keys = ["year", "month", "day", "hour", "minute", "second"];
  for (const k of keys) {
    if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  }
  return 0;
}

/**
 * UTC epoch ms for a wall time in `timeZone`.
 * @param {{ year: number; month: number; day: number; hour?: number; minute?: number; second?: number }} w
 * @param {string} timeZone
 */
export function wallTimeToUtcMs(w, timeZone) {
  const target = {
    year: w.year,
    month: w.month,
    day: w.day,
    hour: w.hour ?? 0,
    minute: w.minute ?? 0,
    second: w.second ?? 0,
  };
  let lo = Date.UTC(w.year, w.month - 1, w.day - 2, 0, 0, 0);
  let hi = Date.UTC(w.year, w.month - 1, w.day + 2, 23, 59, 59);
  for (let i = 0; i < 56; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const c = cmpWall(getWallParts(mid, timeZone), target);
    if (c === 0) return mid;
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.floor((lo + hi) / 2);
}

/**
 * @param {number} y
 * @param {number} m
 * @param {number} d
 * @param {number} deltaDays
 */
export function addCalendarDays(y, m, d, deltaDays) {
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

/**
 * ISO week number and ISO week-year for a Gregorian calendar date (civil Y-M-D).
 * @param {number} y
 * @param {number} m
 * @param {number} d
 */
export function isoWeekCalendar(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, week };
}

/**
 * Gregorian Y-M-D for Monday of ISO week (isoYear, week), UTC calendar math.
 * @param {number} isoYear
 * @param {number} week
 */
export function mondayOfIsoWeek(isoYear, week) {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4.getTime() - (dow - 1) * 86400000);
  return addCalendarDays(
    mondayWeek1.getUTCFullYear(),
    mondayWeek1.getUTCMonth() + 1,
    mondayWeek1.getUTCDate(),
    (week - 1) * 7,
  );
}

/** @returns {string} */
export function getDefaultTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * @param {number} nowMs
 * @param {string} timeZone
 * @returns {{ label: string; percent: number; week?: number; live: string }}
 */
export function computeDay(nowMs, timeZone) {
  const p = getWallParts(nowMs, timeZone);
  const start = wallTimeToUtcMs({ year: p.year, month: p.month, day: p.day }, timeZone);
  const next = wallTimeToUtcMs(addCalendarDays(p.year, p.month, p.day, 1), timeZone);
  const total = next - start;
  const elapsed = Math.min(Math.max(nowMs - start, 0), total);
  const percent = total > 0 ? (elapsed / total) * 100 : 0;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  })
    .format(new Date(nowMs))
    .toUpperCase();
  const live = formatLiveSummary("day", percent, timeZone, nowMs);
  return { label, percent, live };
}

/**
 * @param {number} nowMs
 * @param {string} timeZone
 */
export function computeWeek(nowMs, timeZone) {
  const p = getWallParts(nowMs, timeZone);
  const { isoYear, week } = isoWeekCalendar(p.year, p.month, p.day);
  const mon = mondayOfIsoWeek(isoYear, week);
  const start = wallTimeToUtcMs(mon, timeZone);
  const monNext = addCalendarDays(mon.year, mon.month, mon.day, 7);
  const end = wallTimeToUtcMs(monNext, timeZone);
  const total = end - start;
  const elapsed = Math.min(Math.max(nowMs - start, 0), total);
  const percent = total > 0 ? (elapsed / total) * 100 : 0;
  const label = `WEEK ${week}`;
  const live = formatLiveSummary("week", percent, timeZone, nowMs, week);
  return { label, percent, week, live };
}

/**
 * @param {number} nowMs
 * @param {string} timeZone
 */
export function computeMonth(nowMs, timeZone) {
  const p = getWallParts(nowMs, timeZone);
  const start = wallTimeToUtcMs({ year: p.year, month: p.month, day: 1 }, timeZone);
  const nextMonth =
    p.month === 12
      ? { year: p.year + 1, month: 1, day: 1 }
      : { year: p.year, month: p.month + 1, day: 1 };
  const end = wallTimeToUtcMs(nextMonth, timeZone);
  const total = end - start;
  const elapsed = Math.min(Math.max(nowMs - start, 0), total);
  const percent = total > 0 ? (elapsed / total) * 100 : 0;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
  })
    .format(new Date(nowMs))
    .toUpperCase();
  const live = formatLiveSummary("month", percent, timeZone, nowMs);
  return { label, percent, live };
}

/**
 * @param {number} nowMs
 * @param {string} timeZone
 */
export function computeQuarter(nowMs, timeZone) {
  const p = getWallParts(nowMs, timeZone);
  const q = Math.floor((p.month - 1) / 3) + 1;
  const startMonth = (q - 1) * 3 + 1;
  const start = wallTimeToUtcMs({ year: p.year, month: startMonth, day: 1 }, timeZone);
  const endMonth = startMonth + 3;
  const end =
    endMonth > 12
      ? wallTimeToUtcMs({ year: p.year + 1, month: endMonth - 12, day: 1 }, timeZone)
      : wallTimeToUtcMs({ year: p.year, month: endMonth, day: 1 }, timeZone);
  const total = end - start;
  const elapsed = Math.min(Math.max(nowMs - start, 0), total);
  const percent = total > 0 ? (elapsed / total) * 100 : 0;
  const label = `Q${q} ${p.year}`;
  const live = formatLiveSummary("quarter", percent, timeZone, nowMs, q);
  return { label, percent, live };
}

/**
 * @param {number} nowMs
 * @param {string} timeZone
 */
export function computeYear(nowMs, timeZone) {
  const p = getWallParts(nowMs, timeZone);
  const start = wallTimeToUtcMs({ year: p.year, month: 1, day: 1 }, timeZone);
  const end = wallTimeToUtcMs({ year: p.year + 1, month: 1, day: 1 }, timeZone);
  const total = end - start;
  const elapsed = Math.min(Math.max(nowMs - start, 0), total);
  const percent = total > 0 ? (elapsed / total) * 100 : 0;
  const label = String(p.year);
  const live = formatLiveSummary("year", percent, timeZone, nowMs);
  return { label, percent, live };
}

/**
 * @param {"day"|"week"|"month"|"quarter"|"year"} kind
 * @param {number} percentElapsed
 * @param {string} timeZone
 * @param {number} nowMs
 * @param {number} [extra]
 */
function formatLiveSummary(kind, percentElapsed, timeZone, nowMs, extra) {
  const pct = percentElapsed.toFixed(1);
  const remaining = (100 - percentElapsed).toFixed(1);
  const tzLabel = timeZone.replace(/_/g, " ");
  const clock = new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(nowMs));

  switch (kind) {
    case "day":
      return `Today is ${percentElapsed.toFixed(0)} percent elapsed, ${remaining} percent remaining in the day. ${clock}. Time zone: ${tzLabel}.`;
    case "week":
      return `ISO week ${extra} is ${percentElapsed.toFixed(0)} percent elapsed, ${remaining} percent remaining. ${clock}. Time zone: ${tzLabel}.`;
    case "month":
      return `This month is ${percentElapsed.toFixed(0)} percent elapsed, ${remaining} percent remaining. ${clock}. Time zone: ${tzLabel}.`;
    case "quarter":
      return `Quarter ${extra} is ${percentElapsed.toFixed(0)} percent elapsed, ${remaining} percent remaining. ${clock}. Time zone: ${tzLabel}.`;
    case "year":
      return `${getWallParts(nowMs, timeZone).year} is ${percentElapsed.toFixed(0)} percent elapsed, ${remaining} percent remaining. ${clock}. Time zone: ${tzLabel}.`;
    default:
      return `${pct} percent elapsed.`;
  }
}

/** @type {readonly ["day","week","month","quarter","year"]} */
export const WIDGET_KEYS = ["day", "week", "month", "quarter", "year"];

/**
 * @param {string} key
 * @param {number} nowMs
 * @param {string} timeZone
 * @returns {{ label: string; percent: number; week?: number; live: string }}
 */
export function computeWidget(key, nowMs, timeZone) {
  switch (key) {
    case "day":
      return computeDay(nowMs, timeZone);
    case "week":
      return computeWeek(nowMs, timeZone);
    case "month":
      return computeMonth(nowMs, timeZone);
    case "quarter":
      return computeQuarter(nowMs, timeZone);
    case "year":
      return computeYear(nowMs, timeZone);
    default:
      return { label: "", percent: 0, live: "" };
  }
}
