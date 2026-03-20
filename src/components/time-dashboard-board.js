// @ts-check
import { LitElement, html } from "lit";
import { computeWidget, WIDGET_KEYS } from "../lib/time-calculations.js";
import { resolvedTimeZone } from "../lib/settings-storage.js";
import "./time-progress-row.js";

export class TimeDashboardBoard extends LitElement {
  static properties = {
    _nowMs: { state: true, type: Number },
    settings: { type: Object },
  };

  constructor() {
    super();
    this._nowMs = Date.now();
    /** @type {import("../lib/settings-storage.js").AppSettings} */
    this.settings = { widgets: [...WIDGET_KEYS], timezone: null };
    this._timer = 0;
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._timer = window.setInterval(() => {
      this._nowMs = Date.now();
    }, 1000);
  }

  disconnectedCallback() {
    window.clearInterval(this._timer);
    this._timer = 0;
    super.disconnectedCallback();
  }

  render() {
    const tz = resolvedTimeZone(this.settings);
    const ordered = WIDGET_KEYS.filter((k) => this.settings.widgets.includes(k));

    return html`
      <section
        class="card"
        id="dashboard-panel"
        aria-labelledby="app-heading"
        role="region"
      >
        <div class="rows-host" role="list" aria-label="Time progress by period">
          ${ordered.map((key) => {
            const data = computeWidget(key, this._nowMs, tz);
            return html`
              <time-progress-row
                role="listitem"
                id=${`widget-${key}`}
                kind=${key}
                .label=${data.label}
                .live=${data.live}
                .percent=${data.percent}
              ></time-progress-row>
            `;
          })}
        </div>
        <p class="status" id="clock-status" aria-live="polite">${this._formatClock(tz)}</p>
      </section>
    `;
  }

  /**
   * @param {string} tz
   */
  _formatClock(tz) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date(this._nowMs));
  }
}

customElements.define("time-dashboard-board", TimeDashboardBoard);
