// @ts-check
import rowCss from "./time-progress-row.css?inline";

const DOTS = 40;

export class TimeProgressRow extends HTMLElement {
  static observedAttributes = ["label", "percent", "kind", "live"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const label = this.getAttribute("label") ?? "";
    const kind = this.getAttribute("kind") ?? "period";
    const pct = Math.min(100, Math.max(0, Number.parseFloat(this.getAttribute("percent") ?? "0")));
    const filled = Math.round((pct / 100) * DOTS);
    const rowId = this.id || `row-${kind}`;
    const live = this.getAttribute("live") ?? "";

    if (!this.shadowRoot) return;

    const dotsHtml = Array.from({ length: DOTS }, (_, i) => {
      const on = i < filled ? " dot-on" : "";
      return `<span class="dot${on}" aria-hidden="true"></span>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>${rowCss}</style>
      <div class="row" role="group" aria-describedby="${rowId}-live">
        <p class="label" id="${rowId}-label">${escapeHtml(label)}</p>
        <div class="bar-wrap">
          <div
            class="dots"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${Math.round(pct)}"
            aria-valuetext="${pct.toFixed(1)} percent of this ${escapeAttr(kind)} elapsed"
            aria-labelledby="${rowId}-label"
          >
            ${dotsHtml}
          </div>
        </div>
        <div class="pct" aria-hidden="true">${pct.toFixed(0)}%</div>
      </div>
      <span class="sr-only" id="${rowId}-live" aria-live="polite">${escapeHtml(live)}</span>
    `;
  }
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** @param {string} s */
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("'", "&#39;");
}

customElements.define("time-progress-row", TimeProgressRow);
