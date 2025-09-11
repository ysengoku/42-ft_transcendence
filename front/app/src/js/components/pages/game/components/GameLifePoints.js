export class GameLifePoint extends HTMLElement {
  #MAX_POINT = 20;
  #WEAK_LEVEL = 10;
  #DANGER_LEVEL = 5;
  #RATE = 100 / this.#MAX_POINT;
  #ORANGE = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400').trim();
  #RED = getComputedStyle(document.documentElement).getPropertyValue('--pm-red-500').trim();

  #state = {
    p1CurrentPoint: this.#MAX_POINT,
    p2CurrentPoint: this.#MAX_POINT,
  };

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  updatePoint(playerWhoScoreNumber, newPoint) {
    let lifeBarElement = null;
    let lifePoint = 0;
    if (playerWhoScoreNumber === 1) {
      lifeBarElement = this.p1LifeBar;
      this.#state.p1CurrentPoint = newPoint < 0 ? 0 : newPoint;
      lifePoint = this.#state.p1CurrentPoint;
    } else if (playerWhoScoreNumber === 0) {
      lifeBarElement = this.p2LifeBar;
      this.#state.p2CurrentPoint = newPoint < 0 ? 0 : newPoint;
      lifePoint = this.#state.p2CurrentPoint;
    }
    if (lifePoint < 0 || !lifeBarElement) {
      return;
    }
    log.info(`Player ${playerWhoScoreNumber} lost life point`);
    const newWidth = lifePoint * this.#RATE + '%';
    lifeBarElement.style.width = newWidth;
    if (lifePoint <= this.#WEAK_LEVEL && lifePoint >= this.#DANGER_LEVEL) {
      lifeBarElement.style.backgroundColor = this.#ORANGE;
    }
    if (lifePoint <= this.#DANGER_LEVEL) {
      lifeBarElement.style.backgroundColor = this.#RED;
    }
  }

  decreasePoint(playerWhoScoreNumber, unit) {
    let lifePoint = 0;
    if (playerWhoScoreNumber === 1) {
      this.#state.p1CurrentPoint = this.#state.p1CurrentPoint - unit < 0 ? 0 : this.#state.p1CurrentPoint - unit;
      lifePoint = this.#state.p1CurrentPoint;
    } else if (playerWhoScoreNumber === 0) {
      this.#state.p2CurrentPoint = this.#state.p2CurrentPoint - unit < 0 ? 0 : this.#state.p2CurrentPoint - unit;
      lifePoint = this.#state.p2CurrentPoint;
    }
    this.updatePoint(playerWhoScoreNumber, lifePoint);
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.p1LifeBar = this.querySelector('#p1-life-bar');
    this.p2LifeBar = this.querySelector('#p2-life-bar');
  }

  template() {
    return `
    <div class="life-bars-wrapper d-flex flex-column justify-content-between align-items-center m-2">
      <div id="p1-life-bar-wrapper" class="life-bar-wrapper wood-board d-flex flex-row px-2 py-1 align-items-center">
        <i class="bi bi-lightning-fill pt-1 me-2"></i>
        <div id="p1-life-bar" class="life-bar"></div>
      </div>
      <div id="p2-life-bar-wrapper" class="life-bar-wrapper wood-board d-flex flex-row px-2 py-1 align-items-center">
        <i class="bi bi-lightning-fill pt-1 me-2"></i>
        <div id="p2-life-bar" class="life-bar"></div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .life-bars-wrapper {
      position: absolute;
      top: 96px;
      bottom: 40px;
      left: 0;
      right: 0;
      margin: auto;
    }
    .life-bar-wrapper {
      width: 240px;
      height: 24px;
    }
    .life-bar {
      height: 100%;
      background-color: var(--pm-green-400);
      border-radius: 8px;
      transition: width 0.3s;
    }
    .bi-lightning-fill {
      color: rgba(var(--pm-primary-100-rgb), 0.6);
    }
    #p1-life-bar,
    #p2-life-bar {
      width: 100%;
    }
    </style>
    `;
  }
}

customElements.define('game-life-point', GameLifePoint);
