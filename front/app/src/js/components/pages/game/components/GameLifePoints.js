export class GameLifePoint extends HTMLElement {
  #navbarHeight = 64;

  #MAX_POINT = 20;
  #WEAK = 10;
  #DANGER = 5;

  #state = {
    p1CurrentPoint: this.#MAX_POINT,
    p2CurrentPoint: this.#MAX_POINT,
  };

  constructor() {
    super();

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }
  }

  connectedCallback() {
    this.render();
  }

  decreasePoint(playerNumber) {
    if (playerNumber === 1) {
      this.#state.p1CurrentPoint--;
      if (this.p1LifeBar) {
        const newWidth = this.#state.p1CurrentPoint * 5 + 'px';
        this.p1LifeBar.width = newWidth;
      }
    }
    if (playerNumber === 2) {
      this.#state.p2CurrentPoint--;
    }
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.p1LifeBar = this.querySelector('#p1-life-bar');
    this.p2LifeBar = this.querySelector('#p2-life-bar');
  }

  template() {
    return `
    <div class="life-bars-wrapper d-flex flex-column justify-content-between align-items-center">
      <div id="p1-life-bar-wrapper" class="life-bar-wrapper wood-board d-flex flex-row px-2 py-1 align-items-center">
        <i class="bi bi-lightning-fill pt-1 me-2"></i>
        <div id="p1-life-bar" class="life-bar"></div>
      </div>
      <div id="p2-life-bar-wrapper" class="life-bar-wrapper wood-board d-flex flex-row px-2 py-1 align-items-center">
        <i class="bi bi-lightning-fill pt-1 me-2"></i>
        <div class="life-bar"></div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .life-bars-wrapper {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      margin: 0 auto;
    }
    .life-bar-wrapper {
      width: 200px;
      height: 24px;
    }
    .life-bar {
      height: 100%;
      width: 100%;
      background-color: var(--pm-green-400);
      border-radius: 8px;
      transition: width 0.3s;
    }
    #p1-life-bar-wrapper {
      margin-top: 12%;
      
    }
    #p2-life-bar-wrapper {
      margin-bottom: 10%;
    }
    .bi-lightning-fill {
      color: rgba(var(--pm-primary-100-rgb), 0.6);
    }
    </style>
    `;
  }
}

customElements.define('game-life-point', GameLifePoint);
