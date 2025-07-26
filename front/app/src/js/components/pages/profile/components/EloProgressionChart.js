import { apiRequest, API_ENDPOINTS } from '@api';

export class UserEloProgressionChart extends HTMLElement {
  SVGNS = 'http://www.w3.org/2000/svg';

  #state = {
    loggedInUsername: '',
    username: '',
    history: [],
    totalItemCount: 0,
    currentItemCount: 0,
    currentWeekIndex: 0,
  };

  #valueRange = {
    min: 0,
    max: 3000,
  };
  #eloMidrange = Math.round((this.#valueRange.min + this.#valueRange.max) / 2);

  #yCoordinate = {
    max: 110,
    min: 20,
    mid: 65,
  };
  #scaleY = (this.#yCoordinate.max - this.#yCoordinate.min) / (this.#valueRange.max - this.#valueRange.min);

  constructor() {
    super();

    this.renderPrevious = this.renderPrevious.bind(this);
    this.renderNext = this.renderNext.bind(this);
  }

  setData(loggedInUsername, username, data) {
    this.#state.loggedInUsername = loggedInUsername;
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
    this.innerHTML = this.style() + this.template();

    this.chart = this.querySelector('.line-chart-wrapper');
    this.previousButton = this.querySelector('#btn-elo-history-prev');
    this.nextButton = this.querySelector('#btn-elo-history-next');
    this.previousButton.addEventListener('click', this.renderPrevious);
    this.nextButton.addEventListener('click', this.renderNext);

    if (this.#state.history.length === 0) {
      this.chart.textContent = 'No data';
      this.chart.classList.add('d-flex', 'justify-content-center', 'align-items-center');
      this.previousButton.classList.add('invisible');
      return;
    }
    this.renderChart();
  }

  renderChart() {
    this.parseData();
    this.chart.innerHTML = '';

    const points = this.parsedData.map((item) => `${item.x},${item.y}`).join(' ');
    const svg = this.linechartSVG();
    const polyline = this.generateLineGraph(points);
    const markers = document.createElementNS(this.SVGNS, 'g');
    markers.classList.add('line-chart-marker');
    svg.appendChild(polyline);
    svg.appendChild(markers);

    const labels = svg.querySelector('.linechart-labels');
    this.parsedData.forEach((item, index) => {
      const label = document.createElementNS(this.SVGNS, 'text');
      index === 0 ? label.setAttribute('x', item.x - 3) : label.setAttribute('x', item.x - 6);
      label.setAttribute('y', 118);
      label.setAttribute('text-anchor', 'center');
      label.textContent = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
      labels.appendChild(label);

      const marker = document.createElementNS(this.SVGNS, 'circle');
      marker.setAttribute('cx', item.x);
      marker.setAttribute('cy', item.y);
      marker.setAttribute('r', '2');
      marker.setAttribute('data-value', item.elo);

      const tooltip = document.createElementNS(this.SVGNS, 'text');
      tooltip.setAttribute('y', item.y - 8);
      tooltip.setAttribute('font-size', '0.5rem');
      tooltip.setAttribute('fill', 'var(--pm-primary-700)');
      tooltip.setAttribute('visibility', 'hidden');
      tooltip.textContent = item.elo + ' (' + item.elo_change + ')';

      const tooltipBg = document.createElementNS(this.SVGNS, 'rect');
      tooltipBg.setAttribute('y', item.y - 18);
      tooltipBg.setAttribute('rx', '4');
      tooltipBg.setAttribute('ry', '4');
      tooltipBg.setAttribute('width', '48');
      tooltipBg.setAttribute('height', '16');
      tooltipBg.setAttribute('fill', 'rgba(var(--pm-primary-100-rgb), 0.5');
      tooltipBg.setAttribute('visibility', 'hidden');

      switch (index) {
        case 0:
          if (this.parsedData.length === 7) {
            tooltip.setAttribute('text-anchor', 'start');
            tooltip.setAttribute('x', item.x + 6);
            tooltipBg.setAttribute('x', item.x - 2);
            break;
          }
        case 6:
          tooltip.setAttribute('text-anchor', 'end');
          tooltip.setAttribute('x', item.x - 6);
          tooltipBg.setAttribute('x', item.x - 44);
          break;
        default:
          tooltip.setAttribute('text-anchor', 'middle');
          tooltip.setAttribute('x', item.x);
          tooltipBg.setAttribute('x', item.x - 24);
          break;
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

    this.chart.appendChild(svg);
  }

  linechartSVG() {
    const yLabelPosition = {
      min: this.#yCoordinate.max,
      max: this.#yCoordinate.min + 2,
      mid: this.#yCoordinate.mid,
    };

    // Create the main svg
    const svg = document.createElementNS(this.SVGNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '232');
    svg.setAttribute('viewBox', '0 0 280 120');
    svg.setAttribute('preserveAspectRatio', 'none');

    // Create Y-axis grid
    const yGrid = document.createElementNS(this.SVGNS, 'g');
    yGrid.classList.add('linechart-grid', 'y-linechart-grid');
    const yLine = document.createElementNS(this.SVGNS, 'line');
    yLine.setAttribute('x1', '20');
    yLine.setAttribute('x2', '20');
    yLine.setAttribute('y1', '10');
    yLine.setAttribute('y2', '110');
    yGrid.appendChild(yLine);
    svg.appendChild(yGrid);

    // Create Y-axis labels
    const yLabels = document.createElementNS(this.SVGNS, 'g');
    yLabels.classList.add('linechart-labels');

    const yLabelMin = document.createElementNS(this.SVGNS, 'text');
    yLabelMin.setAttribute('x', '18');
    yLabelMin.setAttribute('y', yLabelPosition.min);
    yLabelMin.setAttribute('text-anchor', 'end');
    yLabelMin.textContent = this.#valueRange.min;

    const yLabelMid = document.createElementNS(this.SVGNS, 'text');
    yLabelMid.setAttribute('x', '18');
    yLabelMid.setAttribute('y', yLabelPosition.mid);
    yLabelMid.setAttribute('text-anchor', 'end');
    yLabelMid.textContent = this.#eloMidrange;

    const yLabelMax = document.createElementNS(this.SVGNS, 'text');
    yLabelMax.setAttribute('x', '18');
    yLabelMax.setAttribute('y', yLabelPosition.max);
    yLabelMax.setAttribute('text-anchor', 'end');
    yLabelMax.textContent = this.#valueRange.max;

    yLabels.appendChild(yLabelMin);
    yLabels.appendChild(yLabelMid);
    yLabels.appendChild(yLabelMax);
    svg.appendChild(yLabels);

    // Create X-axis grid
    const xGrid = document.createElementNS(this.SVGNS, 'g');
    xGrid.classList.add('linechart-grid', 'x-linechart-grid');
    const xLine = document.createElementNS(this.SVGNS, 'line');
    xLine.setAttribute('x1', '20');
    xLine.setAttribute('x2', '270');
    xLine.setAttribute('y1', '110');
    xLine.setAttribute('y2', '110');
    xGrid.appendChild(xLine);
    svg.appendChild(xGrid);

    // Create X-axis labels
    const xLabels = document.createElementNS(this.SVGNS, 'g');
    xLabels.classList.add('linechart-labels');
    svg.appendChild(xLabels);

    return svg;
  }

  generateLineGraph(points) {
    const polyline = document.createElementNS(this.SVGNS, 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', 'var(--pm-primary-600)');
    polyline.setAttribute('stroke-width', '1');
    return polyline;
  }

  parseData() {
    const cunkedData = this.chunkArray(this.#state.history);
    const dataToDisplay = cunkedData[this.#state.currentWeekIndex];
    dataToDisplay.reverse();

    const count = dataToDisplay.length;
    const startX = 20 + (7 - count) * 40;

    this.adjustYAxis(dataToDisplay);

    this.parsedData = [];
    dataToDisplay.forEach((item, index) => {
      const date = new Date(item.day);
      const eloChange = item.daily_elo_change > 0 ? '+' + item.daily_elo_change : item.daily_elo_change;
      this.parsedData.push({
        date: date,
        elo: item.elo_result,
        elo_change: eloChange,
        x: startX + index * 40,
        y: this.#yCoordinate.max - (item.elo_result - this.#valueRange.min) * this.#scaleY,
      });
    });
  }

  chunkArray(array) {
    const result = [];
    for (let i = 0; i < array.length; i += 7) {
      result.push(array.slice(i, i + 7));
    }
    return result;
  }

  adjustYAxis(data) {
    this.#valueRange.min = Math.min(...data.map((item) => item.elo_result));
    this.#valueRange.min = Math.floor(this.#valueRange.min / 10) * 10 - 10;
    this.#valueRange.min = Math.max(this.#valueRange.min, 100);

    this.#valueRange.max = Math.max(...data.map((item) => item.elo_result));
    this.#valueRange.max = Math.floor(this.#valueRange.max / 10) * 10 + 10;
    this.#valueRange.max = Math.min(this.#valueRange.max, 3000);

    this.#eloMidrange = Math.round((this.#valueRange.min + this.#valueRange.max) / 2);
    this.#scaleY = (this.#yCoordinate.max - this.#yCoordinate.min) / (this.#valueRange.max - this.#valueRange.min);
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
    <div class="d-flex flex-row justify-content-between align-items-start">
      <p class="stat-label m-0 ms-3 pe-1">Elo progression</p>
      <div class="d-flex flex-row">
        <button class="btn-elo-history pb-1" id="btn-elo-history-prev" type="button">< prev</button>
        <button class="btn-elo-history pb-1 invisible" id="btn-elo-history-next" type="button" disabled>next ></button>
      </div>
    </div>
    <div class="line-chart-wrapper"></div>
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
      font-size: 8px !important;
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
