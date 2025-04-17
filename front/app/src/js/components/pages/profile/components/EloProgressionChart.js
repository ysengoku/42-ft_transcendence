import { apiRequest, API_ENDPOINTS } from '@api';

export class UserEloProgressionChart extends HTMLElement {
  #state = {
    username: '',
    history: [],
    totalItemCount: 0,
    currentItemCount: 0,
    currentWeekIndex: 0,
  };

  #yRange = {
    min: 0,
    max: 3000,
  };
  #eloMidrange = Math.round((this.#yRange.min + this.#yRange.max) / 2);
  #scaleY = 100 / (this.#yRange.max - this.#yRange.min);

  constructor() {
    super();

    this.renderPrevious = this.renderPrevious.bind(this);
    this.renderNext = this.renderNext.bind(this);
  }

  setData(username, data) {
    this.#state.username = username;
    this.#state.history = data;
    this.#state.currentItemCount = this.#state.history.length;
    if (this.#state.currentItemCount < 7) {
      this.#state.totalItemCount = this.#state.currentItemCount;
    }
    this.#state.maxIndex = this.#state.currentItemCount - 1;
    this.render();
  }

  disconnectedCallback() {
    this.previousButton?.remove;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.chart = this.querySelector('.line-chart-wrapper');
    this.previousButton = this.querySelector('#btn-elo-history-prev');
    this.nextButton = this.querySelector('#btn-elo-history-next');
    this.previousButton.addEventListener('click', this.renderPrevious);
    this.nextButton.addEventListener('click', this.renderNext);

    this.renderChart();
  }

  renderChart() {
    this.parseData();

    this.chart.innerHTML = '';
    this.chart.innerHTML = this.lineChartTemplate();

    const markers = this.querySelector('.line-chart-marker');
    const labels = this.querySelector('.linechart-labels');
    const namespaceUrl = 'http://www.w3.org/2000/svg';
    this.parsedData.forEach((item, index) => {
      const label = document.createElementNS(namespaceUrl, 'text');
      index === 0 ? label.setAttribute('x', item.x - 3) : label.setAttribute('x', item.x - 6);
      label.setAttribute('y', 118);
      label.setAttribute('text-anchor', 'center');
      label.textContent = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
      labels.appendChild(label);

      const marker = document.createElementNS(namespaceUrl, 'circle');
      marker.setAttribute('cx', item.x);
      marker.setAttribute('cy', item.y);
      marker.setAttribute('r', '2');
      marker.setAttribute('data-value', item.elo);

      const tooltip = document.createElementNS(namespaceUrl, 'text');
      tooltip.setAttribute('y', item.y - 8);
      tooltip.setAttribute('font-size', '0.5rem');
      tooltip.setAttribute('fill', 'var(--pm-primary-700)');
      tooltip.setAttribute('visibility', 'hidden');
      tooltip.textContent = item.elo + ' (' + item.elo_change + ')';

      const tooltipBg = document.createElementNS(namespaceUrl, 'rect');
      tooltipBg.setAttribute('y', item.y - 18);
      tooltipBg.setAttribute('rx', '4');
      tooltipBg.setAttribute('ry', '4');
      tooltipBg.setAttribute('width', '48');
      tooltipBg.setAttribute('height', '16');
      tooltipBg.setAttribute('fill', 'rgba(var(--bs-body-color-rgb), 0.5');
      tooltipBg.setAttribute('visibility', 'hidden');

      if (index === 0) {
        tooltip.setAttribute('text-anchor', 'start');
        tooltip.setAttribute('x', item.x + 6);
        tooltipBg.setAttribute('x', item.x);
      } else if (index === 6) {
        tooltip.setAttribute('text-anchor', 'end');
        tooltip.setAttribute('x', item.x - 6);
        tooltipBg.setAttribute('x', item.x - 44);
      } else {
        tooltip.setAttribute('text-anchor', 'middle');
        tooltip.setAttribute('x', item.x);
        tooltipBg.setAttribute('x', item.x - 24);
      }

      marker.addEventListener('mouseenter', () => {
        tooltip.setAttribute('visibility', 'visible');
        tooltipBg.setAttribute('visibility', 'visible');
      });
      marker.addEventListener('mouseleave', () => {
        tooltipBg.setAttribute('visibility', 'hidden');
        tooltip.setAttribute('visibility', 'hidden');
      });

      markers.appendChild(marker);
      markers.insertBefore(tooltipBg, marker);
      markers.insertBefore(tooltip, marker);
    });
  }

  chunkArray(array) {
    const result = [];
    for (let i = 0; i < array.length; i += 7) {
      result.push(array.slice(i, i + 7));
    }
    return result;
  }

  parseData() {
    const cunkedData = this.chunkArray(this.#state.history);
    const dataToDisplay = cunkedData[this.#state.currentWeekIndex];
    dataToDisplay.reverse();

    const count = dataToDisplay.length;
    const startX = 20 + (7 - count) * 40;

    this.parsedData = [];
    dataToDisplay.forEach((item, index) => {
      const date = new Date(item.day);
      const eloChange = item.daily_elo_change > 0 ? '+' + item.daily_elo_change : item.daily_elo_change;
      this.parsedData.push({
        date: date,
        elo: item.elo_result,
        elo_change: eloChange,
        x: startX + index * 40,
        y: 110 - (item.elo_result - this.#yRange.min) * this.#scaleY,
      });
    });
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handlers                                                      */
  /* ------------------------------------------------------------------------ */
  async renderPrevious() {
    if (
      (this.#state.totalItemCount === 0 && this.#state.currentItemCount !== 0) ||
      this.#state.totalItemCount > this.#state.currentItemCount
    ) {
      const response = await this.fetchHistory();
      if (!response) {
        return;
      }
    }
    ++this.#state.currentWeekIndex;
    this.renderChart();

    if (this.nextButton.classList.contains('invisible')) {
      this.nextButton.classList.remove('invisible');
      this.nextButton.removeAttribute('disabled');
    }
    if (this.#state.totalItemCount / 7 < this.#state.currentWeekIndex + 1) {
      this.previousButton.classList.add('invisible');
      this.previousButton.setAttribute('disabled', true);
    }
  }

  async renderNext() {
    --this.#state.currentWeekIndex;
    if (this.previousButton.classList.contains('invisible')) {
      this.previousButton.classList.remove('invisible');
      this.previousButton.removeAttribute('disabled');
    }
    if (this.#state.currentWeekIndex === 0) {
      this.nextButton.classList.add('invisible');
      this.nextButton.setAttribute('disabled', true);
    }
    this.renderChart();
  }

  async fetchHistory() {
    const response = await apiRequest(
        'GET',
        /* eslint-disable-next-line */
        API_ENDPOINTS.DAILY_ELO(this.#state.username, 7, this.#state.currentItemCount),
        null,
        false,
        true,
    );
    if (response.success) {
      this.#state.totalItemCount = response.data.count;
      this.#state.history.push(...response.data.items);
      this.#state.currentItemCount += response.data.items.length;
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & styles                                                   */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-row justify-content-around align-items-start">
      <p class="stat-label m-0 mx-4">Elo progression</p>
      <div class="d-flex flex-row gap-2">
      <button class="btn-elo-history" id="btn-elo-history-prev" type="button">< prev</button>
      <button class="btn-elo-history invisible" id="btn-elo-history-next" type="button" disabled>next ></button>
      </div>
    </div>
    <div class="line-chart-wrapper"></div>
    `;
  }

  lineChartTemplate() {
    const points = this.parsedData.map((item) => `${item.x},${item.y}`).join(' ');
    const yLabelPosition = {
      min: 112 - 100 * this.#scaleY,
      max: 22,
      mid: 68,
    };
    return `
    <div class="line-chart">
      <svg width="100%" height="232" viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <g class="linechart-grid y-linechart-grid">
          <line x1="20" x2="20" y1="10" y2="110"></line> 
        </g>
        <g class="linechart-labels">
          <text x="18" y="${yLabelPosition.min}" text-anchor="end">${this.#yRange.min + 100}</text>
          <text x="18" y="${yLabelPosition.mid}" text-anchor="end">${this.#eloMidrange}</text>
          <text x="18" y="${yLabelPosition.max}" text-anchor="end">${this.#yRange.max}</text>
        </g>
        <g class="linechart-grid x-linechart-grid">
          <line x1="20" x2="270" y1="110" y2="110"></line> 
        </g>
        <g class="linechart-labels"></g>
        <polyline points="${points}" fill="none" stroke="var(--pm-primary-600)" stroke-width="1" />
        <g class="line-chart-marker"></g>
      </svg>
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
