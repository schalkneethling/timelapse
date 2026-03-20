// @ts-check
import appCss from "./time-dashboard-app.css?inline";
import "./time-progress-row.js";
import { computeWidget, WIDGET_KEYS, getDefaultTimeZone } from "../lib/time-calculations.js";

/** @typedef {import("../lib/time-calculations.js").WidgetKey} WidgetKey */
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  resolvedTimeZone,
} from "../lib/settings-storage.js";
import { listTimeZones } from "../lib/timezones.js";

/** @type {Record<WidgetKey, { id: string; title: string; hint: string }>} */
const WIDGET_META = {
  day: { id: "day", title: "Day", hint: "Progress through the current calendar day." },
  week: {
    id: "week",
    title: "Week",
    hint: "ISO week (Monday start). The row shows the week number.",
  },
  month: { id: "month", title: "Month", hint: "Progress through the current month." },
  quarter: {
    id: "quarter",
    title: "Quarter",
    hint: "Calendar quarters (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec).",
  },
  year: { id: "year", title: "Year", hint: "Progress through the calendar year." },
};

export class TimeDashboardApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {ReturnType<typeof loadSettings>} */
    this._settings = defaultSettings();
    this._timer = 0;
    /** @type {AbortController | undefined} */
    this._listenersAbort = undefined;
    this._zones = listTimeZones();
  }

  connectedCallback() {
    this._listenersAbort = new AbortController();
    const { signal } = this._listenersAbort;

    this._settings = loadSettings();
    this.renderStatic();
    this.bindDrawer(signal);
    this.syncDrawerFromSettings();
    this.refresh();
    this._timer = window.setInterval(() => this.refresh(), 1000);
  }

  disconnectedCallback() {
    this._listenersAbort?.abort();
    this._listenersAbort = undefined;
    window.clearInterval(this._timer);
    this._timer = 0;
  }

  renderStatic() {
    const tz = resolvedTimeZone(this._settings);
    const root = this.shadowRoot;
    if (!root) return;
    root.innerHTML = `
      <style>${appCss}</style>
      <div class="bg" aria-hidden="true"></div>
      <div class="shell">
        <div class="top">
          <div class="title-block">
            <h1 class="title" id="app-heading">There is still time</h1>
            <p class="sub" id="tz-line">Time zone · ${escapeHtml(tz.replace(/_/g, " "))}</p>
          </div>
          <button type="button" class="settings-btn" id="open-settings" aria-haspopup="dialog" aria-controls="settings-dialog">
            Settings
          </button>
        </div>
        <section
          class="card"
          id="dashboard-panel"
          aria-labelledby="app-heading"
          role="region"
        >
          <div class="rows-host" id="rows" role="list" aria-label="Time progress by period"></div>
          <p class="status" id="clock-status" aria-live="polite"></p>
        </section>
      </div>
      <dialog class="settings" id="settings-dialog" aria-labelledby="drawer-title">
        <div class="drawer-inner" id="settings-panel">
          <div class="drawer-head">
            <h2 class="drawer-title" id="drawer-title">Configure</h2>
            <button type="button" class="close-btn" id="drawer-cancel" aria-label="Cancel and discard changes">
              Cancel
            </button>
          </div>
          <p class="hint">Choose which periods appear on the board and which time zone drives the math. Tab moves focus; Escape closes and cancels.</p>
          <div class="field">
            <label class="field-label" for="tz-filter">Filter time zones</label>
            <input class="tz-filter" id="tz-filter" type="search" autocomplete="off" placeholder="e.g. Tokyo, Paris" />
            <div class="select-wrap">
              <label class="field-label" for="tz-select">Time zone</label>
              <select id="tz-select" aria-describedby="tz-hint"></select>
            </div>
            <p class="hint" id="tz-hint">Empty selection uses your device time zone (${escapeHtml(getDefaultTimeZone().replace(/_/g, " "))}).</p>
          </div>
          <fieldset class="widgets">
            <legend>Visible widgets</legend>
            ${WIDGET_KEYS.map((k) => widgetCheckbox(k)).join("")}
          </fieldset>
          <button type="button" class="settings-btn" id="drawer-save">
            Save &amp; close
          </button>
        </div>
      </dialog>
    `;
  }

  /**
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  $id(id) {
    return this.shadowRoot?.getElementById(id) ?? null;
  }

  /**
   * @param {AbortSignal} signal
   */
  bindDrawer(signal) {
    const dialog = /** @type {HTMLDialogElement | null} */ (this.$id("settings-dialog"));
    const openBtn = /** @type {HTMLButtonElement | null} */ (this.$id("open-settings"));
    const saveBtn = /** @type {HTMLButtonElement | null} */ (this.$id("drawer-save"));
    const cancelBtn = /** @type {HTMLButtonElement | null} */ (this.$id("drawer-cancel"));
    const tzSelect = /** @type {HTMLSelectElement | null} */ (this.$id("tz-select"));
    const tzFilter = /** @type {HTMLInputElement | null} */ (this.$id("tz-filter"));
    if (!dialog || !openBtn || !saveBtn || !cancelBtn || !tzSelect || !tzFilter) return;

    const listenOpts = { signal };

    openBtn.addEventListener(
      "click",
      () => {
        this._settings = loadSettings();
        this.populateZoneSelect(tzFilter.value.trim());
        this.syncDrawerFromSettings();
        dialog.showModal();
      },
      listenOpts,
    );

    dialog.addEventListener(
      "close",
      () => {
        openBtn.focus();
      },
      listenOpts,
    );

    cancelBtn.addEventListener(
      "click",
      () => {
        this._settings = loadSettings();
        this.syncDrawerFromSettings();
        this.refresh();
        dialog.close();
      },
      listenOpts,
    );

    saveBtn.addEventListener(
      "click",
      () => {
        this.readDrawerIntoSettings();
        saveSettings(this._settings);
        this.refresh();
        dialog.close();
      },
      listenOpts,
    );

    dialog.addEventListener(
      "cancel",
      () => {
        this._settings = loadSettings();
        this.refresh();
      },
      listenOpts,
    );

    tzFilter.addEventListener(
      "input",
      () => {
        this.populateZoneSelect(tzFilter.value.trim());
      },
      listenOpts,
    );

    tzSelect.addEventListener(
      "change",
      () => {
        /* live preview while open */
        this.readDrawerIntoSettings();
        this.refresh();
      },
      listenOpts,
    );

    for (const k of WIDGET_KEYS) {
      const el = /** @type {HTMLInputElement | null} */ (this.$id(`w-${k}`));
      el?.addEventListener(
        "change",
        () => {
          this.readDrawerIntoSettings();
          this.refresh();
        },
        listenOpts,
      );
    }

    this.populateZoneSelect("");
  }

  /**
   * @param {string} filter
   */
  populateZoneSelect(filter) {
    const sel = /** @type {HTMLSelectElement} */ (this.$id("tz-select"));
    const q = filter.toLowerCase();
    const matches = q ? this._zones.filter((z) => z.toLowerCase().includes(q)) : this._zones;
    const grouped = groupByRegion(matches);
    const current = this._settings.timezone ?? "";
    sel.innerHTML = "";
    const optDevice = document.createElement("option");
    optDevice.value = "";
    optDevice.textContent = `Device default (${getDefaultTimeZone().replace(/_/g, " ")})`;
    sel.appendChild(optDevice);
    if (current && !matches.includes(current)) {
      const o = document.createElement("option");
      o.value = current;
      o.textContent = `${current.replace(/_/g, " ")} (filtered)`;
      sel.appendChild(o);
    }
    for (const [region, zones] of grouped) {
      const og = document.createElement("optgroup");
      og.label = region;
      for (const z of zones) {
        const o = document.createElement("option");
        o.value = z;
        o.textContent = z.replace(/_/g, " ");
        og.appendChild(o);
      }
      sel.appendChild(og);
    }
    sel.value = current;
    if (current && sel.value !== current) sel.value = "";
  }

  syncDrawerFromSettings() {
    for (const k of WIDGET_KEYS) {
      const el = /** @type {HTMLInputElement | null} */ (this.$id(`w-${k}`));
      if (el) el.checked = this._settings.widgets.includes(k);
    }
    const sel = /** @type {HTMLSelectElement} */ (this.$id("tz-select"));
    if (sel) {
      const v = this._settings.timezone ?? "";
      sel.value = v;
    }
  }

  readDrawerIntoSettings() {
    const widgets = WIDGET_KEYS.filter((k) => {
      const el = /** @type {HTMLInputElement | null} */ (this.$id(`w-${k}`));
      return el?.checked;
    });
    this._settings.widgets = widgets.length ? widgets : [...WIDGET_KEYS];
    const sel = /** @type {HTMLSelectElement} */ (this.$id("tz-select"));
    const val = sel?.value?.trim() ?? "";
    this._settings.timezone = val.length ? val : null;
  }

  refresh() {
    const tz = resolvedTimeZone(this._settings);
    const tzLine = this.$id("tz-line");
    if (tzLine)
      tzLine.textContent = `Time zone · ${tz.replace(/_/g, " ")}${this._settings.timezone ? "" : " (device)"}`;

    const rowsHost = this.$id("rows");
    const clockEl = this.$id("clock-status");
    if (!rowsHost) return;

    const now = Date.now();
    rowsHost.innerHTML = "";

    const ordered = WIDGET_KEYS.filter((k) => this._settings.widgets.includes(k));
    for (const key of ordered) {
      const data = computeWidget(key, now, tz);
      const row = document.createElement("time-progress-row");
      row.setAttribute("role", "listitem");
      row.setAttribute("kind", key);
      row.setAttribute("label", data.label);
      row.setAttribute("percent", String(data.percent));
      row.setAttribute("live", data.live);
      row.id = `widget-${key}`;
      rowsHost.appendChild(row);
    }

    if (clockEl) {
      clockEl.textContent = new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }).format(new Date(now));
    }
  }
}

/**
 * @param {WidgetKey} key
 */
function widgetCheckbox(key) {
  const m = WIDGET_META[key];
  return `
    <label class="check">
      <input type="checkbox" id="w-${key}" name="widget-${key}" checked />
      <span>${m.title}</span>
    </label>
    <p class="hint" style="margin: 0.15rem 0 0 1.45rem">${m.hint}</p>
  `;
}

/**
 * @param {string[]} zones
 * @returns {[string, string[]][]}
 */
function groupByRegion(zones) {
  /** @type {Map<string, string[]>} */
  const m = new Map();
  for (const z of zones) {
    const region = z.includes("/") ? z.slice(0, z.indexOf("/")) : "General";
    if (!m.has(region)) m.set(region, []);
    const list = m.get(region);
    if (list) list.push(z);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

customElements.define("time-dashboard-app", TimeDashboardApp);
