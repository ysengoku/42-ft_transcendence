/**
 * @module UserEloProgressionChart
 * @description
 * Renders Elo score data in a line chart format,
 * allowing users to navigate through their Elo history 7 days at a time.
 */

import { apiRequest, API_ENDPOINTS } from '@api';

/**
 * @class UserEloProgressionChart
 * @extends HTMLElement
 */
export class UserEloProgressionChart extends HTMLElement {
  // Namespace for SVG elements
  SVGNS = 'http://www.w3.org/2000/svg';

  /**
   * Private state object to hold the component's state.
   * @property {String} loggedInUsername - The username of the logged-in user.
   * @property {String} username - The username for which the Elo progression is displayed.
   * @property {Array} history - The Elo score history data.
   * @property {Number} totalItemCount - Total number of Elo history items available in database.
   * @property {Number} currentItemCount - Total number of fetched Elo history items.
   * @property {Number} currentWeekIndex - Index of the current week being displayed in
   */
  #state = {
    loggedInUsername: '',
    username: '',
    history: [],
    totalItemCount: 0,
    currentItemCount: 0,
    currentWeekIndex: 0,
  };

  /**
   * Value range for Elo scores to be displayed on the current page of the chart.
   * The values are adjusted based on the user's Elo score history.
   * Used to adjust the Y-axis of the chart dynamically based on the data.
   * Midrange Elo value is calculated as the average of min and max.
   */
  #valueRange = {
    min: 0,
    max: 3000,
  };
  #eloMidrange = Math.round((this.#valueRange.min + this.#valueRange.max) / 2);

  /**
   * Y-coordinate settings for the chart.
   * These values define the vertical space for the chart and are used to calculate the Y position
   * of the Elo scores based on the value range.
   * - max: The maximum Y-coordinate for the top of the chart.
   * - min: The minimum Y-coordinate for the bottom of the chart.
   * - mid: The Y-coordinate for the midrange Elo value.
   * The scaleY is calculated based on the difference between max and min Y-coordinates
   * relative to the difference between max and min Elo values.
   */
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
    this.previousButton?.removeEventListener('click', this.renderPrevious);
    this.nextButton?.removeEventListener('click', this.renderNext);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  /**
   * @description
   * Renders the component by setting its inner HTML with styles and template,
   * initializes the chart and buttons, and renders the chart with the current state.
   * If there is no history data, it displays a message indicating that there is no data.
   * @returns {void}
   */
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
    if (this.#state.history.length < 7) {
      this.previousButton.classList.add('invisible');
      this.previousButton.setAttribute('disabled', true);
    }
    this.renderChart();
  }

  /**
   * @description
   * Parses the Elo history data, generates the SVG elements for the line chart,
   * and appends them to the chart container.
   * It creates a polyline for the Elo progression, markers for each data point,
   * and tooltips that display the Elo value and daily change when hovering over the markers.
   */
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

  /**
   * @description
   * Creates the main SVG structure for the Elo progression chart.
   * It includes the Y-axis grid, labels, X-axis grid, and labels.
   * The Y-axis labels are positioned based on the calculated value range and midrange Elo value.
   * The SVG is set to a specific width and height, and the viewBox is defined
   * to ensure proper scaling and aspect ratio.
   * @returns {SVGElement} - The SVG element containing the chart structure.
   */
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

  /**
   * @description
   * Generates a polyline SVG element representing the Elo progression line graph.
   * where each pair represents a point on the graph.
   * The polyline is styled with no fill, a primary color stroke, and a specified stroke width.
   * @param {String} points - A string of coordinates for the polyline, formatted as "x1,y1 x2,y2...".
   * @returns {SVGElement} - The SVG element representing the line graph.
   */
  generateLineGraph(points) {
    const polyline = document.createElementNS(this.SVGNS, 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', 'var(--pm-primary-600)');
    polyline.setAttribute('stroke-width', '1');
    return polyline;
  }

  /**
   * @description
   * Parses the Elo history data to prepare it for rendering in the chart.
   * It chunks the data into 7-day intervals, adjusts the Y-axis based on the Elo scores,
   * and calculates the X and Y coordinates for each data point.
   * The parsed data is stored in the `parsedData` property, which is used to render the chart.
   * @returns {void}
   */
  parseData() {
    const chunkedData = this.chunkArray(this.#state.history);
    const dataToDisplay = chunkedData[this.#state.currentWeekIndex];
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

  /**
   * @description
   * Splits an array into chunks of 7 items each.
   * @param {*} array
   * @returns {Array} - An array of arrays, each containing up to 7 items.
   */
  chunkArray(array) {
    const result = [];
    for (let i = 0; i < array.length; i += 7) {
      result.push(array.slice(i, i + 7));
    }
    return result;
  }

  /**
   * @description
   * Adjusts the Y-axis value range based on the Elo scores in the provided data.
   * It calculates the minimum and maximum Elo scores, rounds them to the nearest 10,
   * and ensures they are within the defined limits (min 100, max 3000).
   * The midrange Elo value is calculated as the average of the adjusted min and max values,
   * and the scaleY is calculated based on the difference between the Y-coordinate limits
   * and the Elo value range.
   * @param {*} Array
   * @returns {void}
   */
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
    if (this.#state.currentItemCount < 7) {
      return;
    }
    if (
      (this.#state.totalItemCount === 0 && this.#state.currentItemCount === 7) ||
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
    if (response.success && response.data && response.data.items) {
      if (response.data.items.length === 0) {
        return false;;
      }
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
