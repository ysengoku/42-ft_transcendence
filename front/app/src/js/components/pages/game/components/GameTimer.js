export class GameTimer extends HTMLElement {
  #state = {
    minutes: 0,
    seconds: 0,
  };

  constructor() {
    super();

    this.minuteElement = null;
    this.secondElement = null;
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
      setTimeout(() => {
        this.#state.minutes = minutes;
        this.minuteElement.textContent = this.#state.minutes;
      }, 50);
    }
    this.#state.seconds = (remainingTime % 60).toString().padStart(2, '0');
    if (this.#state.seconds === '00') {
      this.minuteElement.classList.add('minutes-changed');
      setTimeout(() => {
        this.minuteElement?.classList.remove('minutes-changed');
      }, 700);
    }
    if (this.secondElement) {
      this.secondElement.textContent = this.#state.seconds;
    }
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
  }

  template() {
    return `
    <!-- <div id="game-timer-wrapper" class="d-flex flex-row justify-content-center m-3">
      <div id="game-timer-board" class="wood-board px-2 py-1"> -->
        <div id="game-timer-board-inner" class="d-flex flex-row justify-content-center align-items-center px-3 pt-1">
          <i class="bi bi-stopwatch-fill pe-2"></i>
          <p id="game-timer-minutes" class="game-timer fs-2 m-0"></p>
          <p class="fs-2 fw-bold mx-2 my-0">:</p>
          <p id="game-timer-seconds" class="game-timer fs-2 m-0"></p>
        </div>
      <!-- </div>
    </div> -->
  `;
  }

  style() {
    return `
    <style>  
    #game-timer-board-inner {
      opacity: 0.9;
      background-color: rgba(var(--pm-primary-400-rgb), 0.4);
      clip-path: url(#wave-clip);
      width: 100%;
    }
    .game-timer {
      display: inline-block;
      min-width: 2ch;
      text-align: center;
      }
    #game-timer-minutes {
      min-width: 1ch;
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
