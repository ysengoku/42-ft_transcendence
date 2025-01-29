export class UserWinRatePieGraph extends HTMLElement {
  constructor() {
    super();
    this._data = {
      rate: 0,
      wins: 0,
      losses: 0,
    };
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
  // Test data ---------------------------------------
    this._data = {
      rate: 67,
      wins: 20,
      losses: 10,
    };
    // -------------------------------------------------
    if (this._data.wins === 0 && this._data.losses === 0) {
      this.innerHTML = `
      <style>
          .nodata {
            height: 160px;
            width: 160px;
          }
        </style>
        <div class="d-flex flex-column justify-content-center align-items-center nodata">
          <p>No data</p>
        </div>
      `;
      return;
    }
    const wins = this._data.wins;
    const losses = this._data.losses;
    const rate = this._data.rate;
    const r = 100 / (2 * Math.PI); // radius
    this.innerHTML = `
      <div class="d-flex flex-column justify-content-center align-items-center">
         <svg width="160" height="160" viewBox="0 0 40 40">
          <path
            d="M20 ${(40 - (r * 2)) / 2}
              a ${r} ${r} 0 0 1 0 ${r * 2}
              a ${r} ${r} 0 0 1 0 -${r * 2}"
            fill="none"
            stroke="grey"
            stroke-width="6"
            stroke-dasharray="100"
          />
          <path class="donut"
            d="M20 ${(40 - (r * 2)) / 2}
              a ${r} ${r} 0 0 1 0 ${r * 2}
              a ${r} ${r} 0 0 1 0 -${r * 2}"
            fill="none"
            stroke="#2f2926"
            stroke-width="6"
            stroke-dasharray="${rate} 100"
          />
          <text x="52%" y="40%" text-anchor="middle" dy="7" font-size="0.5rem">
            ${rate}%
          </text>
        </svg>
        <div class="d-flex flex-row justify-content-center">
          <p class="fs-6">Wins: ${wins}</p>
          <p>&nbsp;-&nbsp;</p>
          <p class="fs-6">Losses: ${losses}</p>
        </div>
      </div>
    `;
  }
}

customElements.define('user-win-rate-pie-graph', UserWinRatePieGraph);
