export class GameTimer extends HTMLElement {
  #navbarHeight = 64;
  #state = {
    minutes: 0,
    seconds: 0,
  };

  constructor() {
    super();

    this.minuteElement = null;
    this.secondElement = null;

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }
  }

  connectedCallback() {
    this.render();
  }

  setInitialTimeLimit(timeLimit) {
    this.#state.minutes = Math.floor(timeLimit / 60);
    this.#state.seconds = (timeLimit % 60).toString().padStart(2, '0');
  }

  updateRemainingTime(remainingTime) {
    const minutes = Math.floor(remainingTime / 60);
    if (this.#state.minutes !== minutes && this.minuteElement) {
      this.minuteElement.classList.add('minutes-changed');
      setTimeout(() => {
        this.#state.minutes = minutes;
        this.minuteElement.textContent = this.#state.minutes;
      }, 200);
    }
    this.#state.seconds = (remainingTime % 60).toString().padStart(2, '0');
    if (this.secondElement) {
      this.secondElement.textContent = this.#state.seconds;
    }
    setTimeout(() => {
      this.minuteElement?.classList.remove('minutes-changed');
    }, 800);
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.timerWrapper = this.querySelector('#game-timer-wrapper');
    this.minuteElement = this.querySelector('#game-timer-minutes');
    if (this.minuteElement) {
      this.minuteElement.textContent = this.#state.minutes;
    }
    this.secondElement = this.querySelector('#game-timer-seconds');
    if (this.secondElement) {
      this.secondElement.textContent = this.#state.seconds;
    }

    // --- Test ---------------------
    // setTimeout(() => {
    //   this.updateRemainingTime(120);
    // }, 2000);
    // ------------------------------
  }

  template() {
    return `
    <div id="game-timer-wrapper" class="d-flex flex-row justify-content-center m-2">
      <div id="game-timer-board" class="wood-board px-2 py-1">
        <div id="game-timer-board-inner" class="d-flex flex-row justify-content-center align-items-center px-3 pt-1">
          <i class="bi bi-stopwatch-fill me-3"></i>
          <p id="game-timer-minutes" class="game-timer fs-2 m-0"></p>
          <p class="fs-2 fw-bold mx-2 my-0">:</p>
          <p id="game-timer-seconds" class="game-timer fs-2 m-0"></p>
        </div>
      </div>
    </div>
  `;
  }

  style() {
    return `
    <style>
    #game-timer-wrapper {
      position: absolute;
      top: calc(${this.#navbarHeight}px + 8px);
      left: 0;
      right: 0;
    }
    #game-timer-board {
      display: inline-flex;
      width: fit-content;
      color: var(--pm-primary-100);
      font-family: 'van dyke';
    }
    #game-timer-board-inner {
      opacity: 0.9;
      background-color: rgba(var(--pm-primary-400-rgb), 0.4);
      clip-path: url(#wave-clip);
    }
    .game-timer {
    }
    .minutes-changed {
      transition-delay: 0s;
      transform: scale(1);
      animation: popup 0.6s ease;
    }
    @keyframes popup {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.5); }
      100% { transform: scale(1); }
    }
    </style>
    `;
  }
}

customElements.define('game-timer', GameTimer);
