// @ts-check
import { WIDGET_KEYS, getDefaultTimeZone } from "./time-calculations.js";

const STORAGE_KEY = "there-is-still-time:v1";

/** @typedef {import("./time-calculations.js").WidgetKey} WidgetKey */

/** @typedef {{ widgets: WidgetKey[]; timezone: string | null }} AppSettings */

/** @returns {AppSettings} */
export function defaultSettings() {
  return {
    widgets: [...WIDGET_KEYS],
    timezone: null,
  };
}

/** @returns {AppSettings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    /** @type {{ widgets?: unknown; timezone?: unknown }} */
    const data = JSON.parse(raw);
    const rawWidgets = data.widgets;
    const widgets = Array.isArray(rawWidgets)
      ? rawWidgets.filter(
          /** @param {unknown} k */
          (k) => typeof k === "string" && WIDGET_KEYS.includes(/** @type {WidgetKey} */ (k)),
        )
      : [...WIDGET_KEYS];
    const timezone =
      typeof data.timezone === "string" && data.timezone.length > 0 ? data.timezone : null;
    return {
      widgets: widgets.length ? widgets : [...WIDGET_KEYS],
      timezone,
    };
  } catch {
    return defaultSettings();
  }
}

/** @param {AppSettings} s */
export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/**
 * @param {AppSettings} s
 * @returns {string}
 */
export function resolvedTimeZone(s) {
  return s.timezone ?? getDefaultTimeZone();
}
