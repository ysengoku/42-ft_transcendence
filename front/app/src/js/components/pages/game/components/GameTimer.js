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
    if (this.#state.minutes !== minutes) {
      this.timerWrapper.classList.add('minutes-changed');
    }
    this.#state.minutes = minutes;
    this.#state.seconds = (remainingTime % 60).toString().padStart(2, '0');
    if (this.minuteElement) {
      this.minuteElement.textContent = this.#state.minutes;
    }
    if (this.secondElement) {
      this.secondElement.textContent = this.#state.seconds;
    }
    setTimeout(() => {
      this.timerWrapper.classList.remove('minutes-changed');
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
    setTimeout(() => {
      this.updateRemainingTime(120);
    }, 2000);
    // ------------------------------
  }

  template() {
    return `
    <div id="game-timer-wrapper" class="d-flex flex-row justify-content-center align-items-center p-2">
      <p id="game-timer-minutes" class="game-timer fs-1 m-0"></p>
      <p class="fs-2 fw-bold mx-2">:</p>
      <p id="game-timer-seconds" class="game-timer fs-1 m-0"></p>
    </div>
  `;
  }

  style() {
    return `
    <style>
    #game-timer-wrapper {
      position: absolute;
      top: ${this.#navbarHeight}px;
      left: 0;
      right: 0;
    }
    .game-timer {
      font-family: 'van dyke';
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
