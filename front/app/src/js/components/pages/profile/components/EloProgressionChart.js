import { mockEloHistory } from '@mock/functions/mockEloHistory.js';

export class UserEloProgressionChart extends HTMLElement {
  #state = {
    history: [],
  };

  constructor() {
    super();
  }

  // {
  //   "items": [
  //     {
  //       "day": "2025-04-13",
  //       "daily_elo_change": 0,
  //       "elo_result": 0
  //     }
  //   ],
  //   "count": 0
  // }

  set data(value) {
    // this.#state.history = value.slice().reverse();

    // ------ Test data ---------------------------------
    this.#state.history = mockEloHistory().slice().reverse();
    // --------------------------------------------------

    this.render();
  }

  render() {
    this.parseData();
    this.innerHTML = this.template() + this.style();

    const markers = this.querySelector('.line-chart-marker');
    const labels = this.querySelector('.linechart-labels');
    const namespaceUrl = 'http://www.w3.org/2000/svg';
    this.parsedData.forEach((item) => {
      const label = document.createElementNS(namespaceUrl, 'text');
      label.setAttribute('x', item.x);
      label.setAttribute('y', 120);
      label.setAttribute('text-anchor', 'center');
      label.textContent = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
      labels.appendChild(label);

      const marker = document.createElementNS(namespaceUrl, 'circle');
      marker.setAttribute('cx', item.x);
      marker.setAttribute('cy', item.y);
      marker.setAttribute('r', '2');
      marker.setAttribute('data-value', item.elo);

      const tooltip = document.createElementNS(namespaceUrl, 'text');
      tooltip.setAttribute('x', item.x - 5);
      tooltip.setAttribute('y', item.y + 5);
      tooltip.setAttribute('text-anchor', 'end');
      tooltip.setAttribute('font-size', '10');
      tooltip.setAttribute('fill', 'var(--pm-primary-700)');
      tooltip.setAttribute('visibility', 'hidden');
      tooltip.textContent = item.elo;

      marker.addEventListener('mouseenter', () => {
        tooltip.setAttribute('visibility', 'visible');
      });
      marker.addEventListener('mouseleave', () => {
        tooltip.setAttribute('visibility', 'hidden');
      });

      markers.appendChild(marker);
      markers.insertBefore(tooltip, marker);
    });
  }

  parseData() {
    this.itemCount = this.#state.history.length;

    this.minElo = Math.min(...this.#state.history.map((item) => item.elo_result));
    this.minElo = Math.round(this.minElo / 10) * 10;
    this.maxElo = Math.max(...this.#state.history.map((item) => item.elo_result));
    this.maxElo = Math.round(this.maxElo / 10) * 10;
    this.midrangeElo = Math.round((this.minElo + this.maxElo) / 20) * 10;

    this.scaleY = 100 / (this.maxElo - this.minElo);

    this.parsedData = [];
    this.#state.history.forEach((item, index) => {
      const date = new Date(item.date);
      this.parsedData.push({
        date: date,
        elo: item.elo_result,
        x: 20 + index * 40,
        y: 120 - (item.elo_result - this.minElo) * this.scaleY,
      });
    });
    console.log('Parsed data:', this.parsedData);
  }

  template() {
    const points = this.parsedData.map((item) => `${item.x},${item.y}`).join(' ');
    return `
    <div class="line-chart-wrapper">
      <div class="line-chart">
        <svg width="100%" height="224" viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <g class="linechart-grid y-linechart-grid">
            <line x1="20" x2="20" y1="10" y2="110"></line> 
          </g>
          <g class="linechart-labels">
            <text x="16" y="110" text-anchor="end">${this.minElo}</text>
            <text x="16" y="65" text-anchor="end">${this.midrangeElo}</text>
            <text x="16" y="20" text-anchor="end">${this.maxElo}</text>
          </g>
          <g class="linechart-grid x-linechart-grid">
            <line x1="20" x2="270" y1="110" y2="110"></line> 
          </g>
          <g class="linechart-labels"></g>
            <polyline points="${points}" fill="none" stroke="var(--pm-primary-600)" stroke-width="1" />
		      <g class="line-chart-marker"></g>
        </svg>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .line-chart-wrapper {
      width: 100%;
      height: 240px;
      min-width: 240px;
    }
    .linechart-grid {
      stroke: var(--pm-primary-700);
      stroke-width: 1;
    }
    .linechart-labels {
      font-size: 0.5rem;
      text-align: center;
    }
    .line-chart-marker circle {
	    fill: var(--pm-primary-600);
	  }
    </style>
    `;
  }
}

customElements.define('user-elo-progression-chart', UserEloProgressionChart);
