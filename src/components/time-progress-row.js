// @ts-check
import { LitElement, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { map } from "lit/directives/map.js";

const DOTS = 40;

export class TimeProgressRow extends LitElement {
  static properties = {
    kind: { type: String },
    label: { type: String },
    live: { type: String },
    percent: { type: Number },
  };

  constructor() {
    super();
    this.kind = "period";
    this.label = "";
    this.live = "";
    this.percent = 0;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const pct = Math.min(100, Math.max(0, Number(this.percent)));
    const filled = Math.round((pct / 100) * DOTS);
    const rowId = this.id || `row-${this.kind}`;
    const indices = Array.from({ length: DOTS }, (_, i) => i);

    return html`
      <div class="row" data-kind=${this.kind} role="group" aria-describedby="${rowId}-live">
        <p class="label" id="${rowId}-label">${this.label}</p>
        <div class="bar-wrap">
          <div
            class="dots"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${Math.round(pct)}"
            aria-valuetext="${pct.toFixed(1)} percent of this ${this.kind} elapsed"
            aria-labelledby="${rowId}-label"
          >
            ${map(
              indices,
              (i) =>
                html`<span
                  class=${classMap({ dot: true, "dot-on": i < filled })}
                  aria-hidden="true"
                ></span>`,
            )}
          </div>
        </div>
        <div class="pct" aria-hidden="true">${pct.toFixed(0)}%</div>
      </div>
      <span class="sr-only" id="${rowId}-live" aria-live="polite">${this.live}</span>
    `;
  }
}

customElements.define("time-progress-row", TimeProgressRow);
