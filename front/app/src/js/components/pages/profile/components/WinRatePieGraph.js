export class UserWinRatePieGraph extends HTMLElement {
  #state = {
    rate: 0,
    wins: 0,
    losses: 0,
  };

  constructor() {
    super();
  }

  set data(value) {
    this.#state = value;
    this.render();
  }

  render() {
    this.#state.wins = 12;
    this.#state.losses = 8;
    this.#state.rate = Math.round((this.#state.wins / (this.#state.wins + this.#state.losses)) * 100);
    this.innerHTML = this.template() + this.style();

    if (this.#state.wins === 0 && this.#state.losses === 0) {
      const graph = this.querySelector('.pie-graph');
      graph.classList.add('d-none');
      const noData = this.querySelector('.no-data');
      noData.textContent = 'No data';
      noData.classList.remove('d-none');
      noData.style.width = '80px';
      noData.style.height = '160px';
    }
  }

  template() {
    const r = 100 / (2 * Math.PI); // radius
    return `
    <div class="pie-graph-wrapper d-flex flex-column justify-content-center align-items-center">
      <div class="no-data text-center pt-5 d-none"></div>
      <div class="pie-graph d-flex flex-column jusify-content-around align-items-center">
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
         <path
            d="M20 ${(40 - (r * 2)) / 2}
              a ${r} ${r} 0 0 1 0 ${r * 2}
              a ${r} ${r} 0 0 1 0 -${r * 2}"
            fill="none"
            stroke="rgba(146, 79, 9, 0.4)"
            stroke-width="6"
            stroke-dasharray="100"
          />
          <path class="donut"
            d="M20 ${(40 - (r * 2)) / 2}
              a ${r} ${r} 0 0 1 0 ${r * 2}
              a ${r} ${r} 0 0 1 0 -${r * 2}"
            fill="none"
            stroke="#613304"
            stroke-width="6"
            stroke-dasharray="${this.#state.rate} 100"
          />
          <text x="52%" y="40%" text-anchor="middle" dy="7" font-size="0.5rem">
            ${this.#state.rate}%
          </text>
        </svg>
        <div class="d-flex flex-row justify-content-center mt-2">
          <p class="fs-6 text-center">Wins ${this.#state.wins}</p>
          <p>&nbsp;-&nbsp;</p>
          <p class="fs-6 text-center">Losses ${this.#state.losses}</p>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .pie-graph-wrapper {
      max-width: 160px;
      height: 240px;
    }
    .pie-graph svg {
      width: 88%;
      height: 88%;
    }
    </style>
  `;
  }
}

customElements.define('user-win-rate-pie-graph', UserWinRatePieGraph);
