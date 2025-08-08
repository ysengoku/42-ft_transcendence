/**
 * @module UserWinRatePieGraph
 * @description
 * This module renders a pie graph representing the user's win rate.
 */

import { BREAKPOINT } from '@utils';

/**
 * @class UserWinRatePieGraph
 * @extends HTMLElement
 */
export class UserWinRatePieGraph extends HTMLElement {
  #state = {
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

  /**
   * @description
   * Renders the component by setting its inner HTML with styles and template.
   * It updates the text content for wins and losses, and handles the case where there is
   * no data by displaying a message.
   * If there are no wins and losses, it hides the pie graph and shows a "No data" message.
   * @returns {void}
   */
  render() {
    this.innerHTML = this.style() + this.template();

    const wins = this.querySelector('#wins');
    const losses = this.querySelector('#losses');
    if (wins) {
      wins.textContent = `Wins ${this.#state.wins}`;
    }
    if (losses) {
      losses.textContent = `Losses ${this.#state.losses}`;
    }

    if (this.#state.wins === 0 && this.#state.losses === 0) {
      const pieGraphWrapper = this.querySelector('.pie-graph-wrapper');
      const pieGraph = this.querySelector('.pie-graph');
      pieGraph.classList.add('d-none');
      pieGraphWrapper.classList.add('d-flex', 'justify-content-center', 'align-items-center');
      pieGraphWrapper.textContent = 'No data';
    }
  }

  /**
   * @description
   * Generates the HTML template for the pie graph.
   * It calculates the win rate percentage, constructs the SVG path for the pie graph,
   * and returns the complete HTML string.
   * @returns {String} The HTML string for the pie graph template.
   */
  template() {
    const rate = Math.round((this.#state.wins / (this.#state.wins + this.#state.losses)) * 100);
    const r = 100 / (2 * Math.PI); // radius
    const offset = (40 - r * 2) / 2; // offset to center the pie graph
    const circlePath = `M20 ${offset}
      a ${r} ${r} 0 0 1 0 ${r * 2}
      a ${r} ${r} 0 0 1 0 -${r * 2}`;
    return `
    <div class="pie-graph-wrapper d-flex flex-column justify-content-center align-items-center">
      <div class="pie-graph d-flex flex-column jusify-content-around align-items-center pt-2">
        <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <path
            d="${circlePath}"
            fill="none"
            stroke="rgba(var(--pm-primary-500-rgb), 0.4)"
            stroke-width="6"
            stroke-dasharray="100"
          />
          <path
            d="${circlePath}"
            fill="none"
            stroke="var(--pm-primary-600)"
            stroke-width="6"
            stroke-dasharray="${rate} 100"
          />
          <text x="52%" y="40%" text-anchor="middle" dy="7" font-size="0.5rem">
            ${rate}%
          </text>
        </svg>
        <div class="d-flex flex-row justify-content-center">
          <p class="m-0 text-center" id="wins"></p>
          <p>&nbsp;-&nbsp;</p>
          <p class="m-0 text-center" id="losses"></p>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .pie-graph-wrapper {
      min-width: 120px;
      max-width: 160px;
      height: 240px;
    }
    .pie-graph svg {
      width: 96%;
      height: 96%;
    }
    @media (min-width: ${BREAKPOINT.XXL}px) {
      .pie-graph-wrapper {
        max-width: 240px;
      }
    }
    </style>
  `;
  }
}

customElements.define('user-win-rate-pie-graph', UserWinRatePieGraph);
