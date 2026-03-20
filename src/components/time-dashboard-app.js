// @ts-check
import { LitElement, html, nothing } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { WIDGET_KEYS, getDefaultTimeZone } from "../lib/time-calculations.js";

/** @typedef {import("../lib/time-calculations.js").WidgetKey} WidgetKey */
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  resolvedTimeZone,
} from "../lib/settings-storage.js";
import { listTimeZones } from "../lib/timezones.js";
import "./time-dashboard-board.js";

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

export class TimeDashboardApp extends LitElement {
  static properties = {
    _settings: { state: true, type: Object },
    _tzQuery: { state: true, type: String },
  };

  constructor() {
    super();
    /** @type {import("../lib/settings-storage.js").AppSettings} */
    this._settings = defaultSettings();
    this._tzQuery = "";
    this._zones = listTimeZones();
    /** @type {import("lit/directives/ref.js").Ref<HTMLDialogElement>} */
    this._dialogRef = createRef();
    /** @type {import("lit/directives/ref.js").Ref<HTMLButtonElement>} */
    this._openBtnRef = createRef();
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._settings = loadSettings();
  }

  /**
   * @param {import('lit').PropertyValues} changed
   */
  willUpdate(changed) {
    super.willUpdate(changed);
    if (changed.has("_settings")) {
      this.classList.toggle("maximized", Boolean(this._settings.maximized));
    }
  }

  render() {
    const tz = resolvedTimeZone(this._settings);
    const tzLine = `Time zone · ${tz.replace(/_/g, " ")}${this._settings.timezone ? "" : " (device)"}`;
    const currentTz = this._settings.timezone ?? "";
    const q = this._tzQuery.trim().toLowerCase();
    const matches = q ? this._zones.filter((z) => z.toLowerCase().includes(q)) : this._zones;
    const grouped = groupByRegion(matches);

    return html`
      <div class="bg" aria-hidden="true"></div>
      <div class="shell">
        <div class="top">
          <div class="title-block">
            <h1 class="title" id="app-heading">Timelapse</h1>
            <p class="sub" id="tz-line">${tzLine}</p>
          </div>
          <div class="top-actions" role="group" aria-label="View options">
            <button
              type="button"
              class="settings-btn"
              id="toggle-maximize"
              aria-pressed=${this._settings.maximized ? "true" : "false"}
              @click=${this._onToggleMaximize}
            >
              ${this._settings.maximized ? "Default size" : "Larger view"}
            </button>
            <button
              type="button"
              class="settings-btn"
              id="open-settings"
              aria-haspopup="dialog"
              aria-controls="settings-dialog"
              ${ref(this._openBtnRef)}
              @click=${this._onOpenSettings}
            >
              Settings
            </button>
          </div>
        </div>
        <time-dashboard-board .settings=${this._settings}></time-dashboard-board>
        <p class="credit">
          Inspired by
          <a
            href="https://playground.nothing.tech/detail/app/Ym0wYycapdPGCUPJ"
            target="_blank"
            rel="noopener noreferrer"
            >Finite by Srizan</a>
          (Nothing Tech).
        </p>
      </div>
      <dialog
        class="settings"
        id="settings-dialog"
        aria-labelledby="drawer-title"
        ${ref(this._dialogRef)}
        @close=${this._onDialogClose}
        @cancel=${this._onDialogCancel}
      >
        <div class="drawer-inner" id="settings-panel">
          <div class="drawer-head">
            <h2 class="drawer-title" id="drawer-title">Configure</h2>
            <button
              type="button"
              class="close-btn"
              id="drawer-cancel"
              aria-label="Cancel and discard changes"
              @click=${this._onCancelClick}
            >
              Cancel
            </button>
          </div>
          <p class="hint">
            Choose which periods appear on the board and which time zone drives the math. Tab moves focus;
            Escape closes and cancels.
          </p>
          <div class="field">
            <label class="field-label" for="tz-filter">Filter time zones</label>
            <input
              class="tz-filter"
              id="tz-filter"
              type="search"
              autocomplete="off"
              placeholder="e.g. Tokyo, Paris"
              .value=${this._tzQuery}
              @input=${this._onTzFilterInput}
            />
            <div class="select-wrap">
              <label class="field-label" for="tz-select">Time zone</label>
              <select
                id="tz-select"
                aria-describedby="tz-hint"
                .value=${currentTz}
                @change=${this._onTzSelectChange}
              >
                <option value="">
                  Device default (${getDefaultTimeZone().replace(/_/g, " ")})
                </option>
                ${
                  currentTz && !matches.includes(currentTz)
                    ? html`<option value=${currentTz}>
                      ${currentTz.replace(/_/g, " ")} (filtered)
                    </option>`
                    : nothing
                }
                ${grouped.map(
                  ([region, zones]) => html`
                    <optgroup label=${region}>
                      ${zones.map((z) => html`<option value=${z}>${z.replace(/_/g, " ")}</option>`)}
                    </optgroup>
                  `,
                )}
              </select>
            </div>
            <p class="hint" id="tz-hint">
              Empty selection uses your device time zone (${getDefaultTimeZone().replace(
                /_/g,
                " ",
              )}).
            </p>
          </div>
          <fieldset class="widgets">
            <legend>Visible widgets</legend>
            ${WIDGET_KEYS.map((k) => {
              const m = WIDGET_META[k];
              return html`
                <label class="check">
                  <input
                    type="checkbox"
                    id="w-${k}"
                    name="widget-${k}"
                    .checked=${this._settings.widgets.includes(k)}
                    @change=${(/** @type {Event} */ e) => this._onWidgetCheckChange(k, e)}
                  />
                  <span>${m.title}</span>
                </label>
                <p class="check-hint hint">${m.hint}</p>
              `;
            })}
          </fieldset>
          <button type="button" class="settings-btn" id="drawer-save" @click=${this._onSaveClick}>
            Save &amp; close
          </button>
        </div>
      </dialog>
    `;
  }

  _onToggleMaximize = () => {
    this._settings = {
      ...this._settings,
      maximized: !this._settings.maximized,
    };
    saveSettings(this._settings);
  };

  _onOpenSettings = () => {
    this._settings = loadSettings();
    this._tzQuery = "";
    void this.updateComplete.then(() => this._dialogRef.value?.showModal());
  };

  _onDialogClose = () => {
    this._openBtnRef.value?.focus();
  };

  _onDialogCancel = () => {
    this._settings = loadSettings();
    this._tzQuery = "";
  };

  _onCancelClick = () => {
    this._settings = loadSettings();
    this._tzQuery = "";
    this._dialogRef.value?.close();
  };

  _onSaveClick = () => {
    saveSettings(this._settings);
    this._dialogRef.value?.close();
  };

  /** @param {Event} e */
  _onTzFilterInput = (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    this._tzQuery = el.value;
  };

  /** @param {Event} e */
  _onTzSelectChange = (e) => {
    const el = /** @type {HTMLSelectElement} */ (e.target);
    const val = el.value.trim();
    this._settings = { ...this._settings, timezone: val.length ? val : null };
  };

  /**
   * @param {WidgetKey} key
   * @param {Event} e
   */
  _onWidgetCheckChange = (key, e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    const set = new Set(this._settings.widgets);
    if (el.checked) set.add(key);
    else set.delete(key);
    let widgets = /** @type {WidgetKey[]} */ ([...set]);
    if (!widgets.length) widgets = [...WIDGET_KEYS];
    this._settings = { ...this._settings, widgets };
  };
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

customElements.define("time-dashboard-app", TimeDashboardApp);
