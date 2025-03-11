import { eloHistory } from '@mock/functions/mockEloHistory.js';

export class UserEloProgressionChart extends HTMLElement {
  #state = {
    history: [],
  };

  constructor() {
    super();
  }

  set data(value) {
    // this.#state.history = value.slice().reverse();

    // ------ Test data ---------------------------------
    this.#state.history = eloHistory().slice().reverse();
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
      markers.appendChild(marker);
    });
  }

  parseData() {
    this.itemCount = this.#state.history.length;

    this.minElo = Math.min(...this.#state.history.map((item) => item.elo_result));
    this.maxElo = Math.max(...this.#state.history.map((item) => item.elo_result));

    this.scaleY = 100 / (this.maxElo - this.minElo);

    this.parsedData = [];
    this.#state.history.forEach((item, index) => {
      const date = new Date(item.date);
      this.parsedData.push({
        date: date,
        elo: item.elo_result,
        x: 20 + index * 40,
        y: 110 - (item.elo_result - this.minElo) * this.scaleY,
      });
    });
    console.log('Parsed data:', this.parsedData);
  }

  template() {
    const points = this.parsedData.map((item) => `${item.x},${item.y}`).join(' ');
    return `
    <div class="line-chart-container">
      <div class="line-chart">
        <svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">
          <g class="linechart-grid y-linechart-grid">
            <line x1="20" x2="20" y1="10" y2="110"></line> 
          </g>
          <g class="linechart-labels">
            <text x="16" y="110" text-anchor="end">${this.minElo}</text>
            <text x="16" y="65" text-anchor="end">${Math.round((this.minElo + this.maxElo) / 2)}</text>
            <text x="16" y="20" text-anchor="end">${this.maxElo}</text>
          </g>
          <g class="linechart-grid x-linechart-grid">
            <line x1="20" x2="270" y1="110" y2="110"></line> 
          </g>
          <g class="linechart-labels"></g>
          <polyline points="${points}" fill="none" stroke="#351901" stroke-width="1" />
		  <g class="line-chart-marker"></g>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .line-chart-container {
      width: 100%;
      height: 100%;
    }
    .linechart-grid {
      stroke: #351901;
      stroke-width: 1;
    }
    .linechart-labels {
      font-size: 0.5rem;
      text-align: center;
    }
    .line-chart-marker circl {
	  fill: #351901;
	}
    </style>
    `;
  }
}

customElements.define('user-elo-progression-chart', UserEloProgressionChart);
