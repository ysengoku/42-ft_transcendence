export class GameOptions extends HTMLElement {
  #state = {
    selectedOptions: null,
    defaultOptions: {
      scoreToWin: 15,
      gameSpeed: 'normal',
      isRanked: true,
      timeLimitMinutes: 3,
    },
    range: {
      minScoreToWin: 3,
      maxScoreToWin: 20,
      minTimeLimit: 1,
      maxTimeLimit: 5,
    },
  };

  constructor() {
    super();
    this.updateOptions = this.updateOptions.bind(this);
    this.updateSelectedValueOnRange = this.updateSelectedValueOnRange.bind(this);
  }

  setOptions(options) {
    if (options) {
      this.#state.selectedOptions = options;
    }
  }

  set selectedOptions(options) {
    this.#state.selectedOptions = options;
  }

  get selectedOptions() {
    if (JSON.stringify(this.#state.selectedOptions) !== JSON.stringify(this.#state.defaultOptions)) {
      return this.#state.selectedOptions;
    }
    return null;
  }

  connectedCallback() {
    if (!this.#state.selectedOptions) {
      this.#state.selectedOptions = {
        ...this.#state.defaultOptions
      };
    }
    this.render();
  }

  disconnectedCallback() {
    this.scoreToWinInput?.removeEventListener('input', this.updateOptions);
    this.scoreToWinInput?.removeEventListener('input', this.updateSelectedValueOnRange);
    this.gameSpeedInputs.forEach((input) => {
      input?.removeEventListener('change', this.updateOptions);
    });
    this.isRankedInput?.removeEventListener('change', this.updateOptions);
    this.timeLimitInput?.removeEventListener('input', this.updateOptions);
    this.timeLimitInput?.removeEventListener('input', this.updateSelectedValueOnRange);

    this.innerHTML = '';
    this.modal = null;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.duelMenuComponent = document.querySelector('duel-menu');
    this.closeButton = this.querySelector('.btn-close');
    this.scoreToWinInput = this.querySelector('#score-to-win');
    this.gameSpeedInputs = this.querySelectorAll('input[name="speedOptions"]');
    this.isRankedInput = this.querySelector('#is-ranked');
    this.timeLimitInput = this.querySelector('#time-limit');
    this.confirmButton = this.querySelector('.confirm-button');
    this.cancelButton = this.querySelector('.cancel-button');

    this.scoreToWinInput.addEventListener('input', this.updateOptions);
    this.scoreToWinInput.addEventListener('input', this.updateSelectedValueOnRange);
    this.gameSpeedInputs.forEach((input) => {
      input.addEventListener('change', this.updateOptions);
    });
    this.isRankedInput.addEventListener('change', this.updateOptions);
    this.timeLimitInput.addEventListener('input', this.updateOptions);
    this.timeLimitInput.addEventListener('input', this.updateSelectedValueOnRange);

    const scoreToWinOutput = this.scoreToWinInput.nextElementSibling;
    if (scoreToWinOutput) {
      scoreToWinOutput.value = this.scoreToWinInput.value;
      const pos =
        ((this.scoreToWinInput.value - this.#state.range.minScoreToWin) * 100) /
        (this.#state.range.maxScoreToWin - this.#state.range.minScoreToWin);
      scoreToWinOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
    }
    const selectedGameSpeed = this.#state.selectedOptions.gameSpeed;
    const selectedGameSpeedInput = this.querySelector(`input[name="speedOptions"][value="${selectedGameSpeed}"]`);
    if (selectedGameSpeedInput) {
      selectedGameSpeedInput.checked = true;
    }
    this.#state.selectedOptions.isRanked ? (this.isRankedInput.checked = true) : (this.isRankedInput.checked = false);
    const timeLimitOutput = this.timeLimitInput.nextElementSibling;
    if (timeLimitOutput) {
      timeLimitOutput.value = this.timeLimitInput.value;
      const pos =
        ((this.timeLimitInput.value - this.#state.range.minTimeLimit) * 100) /
        (this.#state.range.maxTimeLimit - this.#state.range.minTimeLimit);
      timeLimitOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  updateOptions(event) {
    event.stopPropagation();
    event.preventDefault();
    const target = event.target;
    if (target.id === 'score-to-win') {
      this.#state.selectedOptions.scoreToWin = parseInt(target.value);
    } else if (target.name === 'speedOptions') {
      this.#state.selectedOptions.gameSpeed = target.value;
    } else if (target.id === 'is-ranked') {
      this.#state.selectedOptions.isRanked = target.checked;
    } else if (target.id === 'time-limit') {
      this.#state.selectedOptions.timeLimitMinutes = parseInt(target.value);
    }
  }

  updateSelectedValueOnRange(event) {
    const target = event.target;
    const output = target.nextElementSibling;
    if (output) {
      output.value = target.value;
    }
    const min = Number(target.min);
    const max = Number(target.max);
    const value = Number(target.value);
    const newPos = ((value - min) * 100) / (max - min);
    output.style.left = `calc(${newPos}% + (${8 - newPos * 0.15}px))`;
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <h2 class="modal-title text-center pb-4">Game Options</h2>
    <div class="form-group d-flex flex-column gap-4">
      <div>
        <label for="score-to-win">Score to Win</label>
        <div class="d-flex align-items-start gap-2">
          <span>${this.#state.range.minScoreToWin}</span>
          <div class="range-wrapper flex-grow-1 pt-1">
            <input type="range" class="form-range" id="score-to-win" value="${this.#state.selectedOptions.scoreToWin}"
              min="${this.#state.range.minScoreToWin}" max="${this.#state.range.maxScoreToWin}" step="1">
            <output></output>
          </div>
          <span>${this.#state.range.maxScoreToWin}</span>
        </div>
      </div>

      <div class="d-flex flex-column pb-4 gap-2">
        <label>Game Speed</label>
        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="speedOptions" id="game-speed-slow" value="slow" autocomplete="off">
          <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-slow">slow</label>

          <input type="radio" class="btn-check" name="speedOptions" id="game-speed-medium" value="medium" autocomplete="off" checked>
          <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-medium">medium</label>

          <input type="radio" class="btn-check" name="speedOptions" id="game-speed-fast" value="fast" autocomplete="off">
	      <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-fast">fast</label>
        </div>
      </div>
              
      <div class="pb-4" id="is-ranked-selector">
        <label for="is-ranked">Ranked</label>
        <div class="d-flex align-items-center gap-2">
          <p class="pe-2 m-0 fs-6 fw-lighter">Casual</p>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="is-ranked" checked>
          </div>
          <p class="ps-2 m-0 fs-6 fw-lighter">Ranked</p>
        </div>
      </div>

      <div>
        <label for="time-limit">Time Limit</label>
        <div class="d-flex align-items-start gap-2">
          <span>${this.#state.range.minTimeLimit}</span>
          <div class="range-wrapper flex-grow-1 pt-1">
            <input type="range" class="form-range" id="time-limit" value="${this.#state.selectedOptions.timeLimitMinutes}"
              min="${this.#state.range.minTimeLimit}" max="${this.#state.range.maxTimeLimit}" step="1">
            <output></output>
          </div>
          <span class="pe-2">${this.#state.range.maxTimeLimit}</span>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    const knobColor = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500');
    const knobUrl =
      'data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\'' +
      ' viewBox=\'-4 -4 8 8\'%3e%3ccircle r=\'3\' fill=\'' +
      encodeURIComponent(knobColor) +
      '\'/%3e%3c/svg%3e';

    return `
    <style>
    .modal-content {
      background-color: transparent;
      color: var(--pm-primary-100) !important;
    }
    .range-wrapper {
      position: relative;
      margin: 0 auto 1.5rem;
      output {
        position: absolute;
        padding: 0 0.6rem 1px 0.6rem;
        top: 1.75rem;
        left: 50%;
        transform: translateX(-50%);
        color: var(--pm-primary-100);
        background: var(--pm-primary-500);
        border-radius: 0.5rem;
      }
    }
    .form-range {
      width: 100%;
      -webkit-appearance :none;
      -moz-appearance :none;
      appearance :none;
      background: none;
    }
    .form-range::-webkit-slider-runnable-track {
      background-color: var(--pm-gray-400);
    }
    .form-range::-webkit-slider-thumb {
      background-color: var(--pm-primary-500);
      border: none;
    }
    .form-range:focus {
      outline: none !important;
      border: none !important;
      drop-shadow: none !important;
    }
    .form-range::-moz-range-track {
      background-color: var(--pm-primary-500);
    }
    .form-range::-moz-range-thumb {
      background-color: var(--pm-primary-500);
      border: none;
    }
    .btn-outline-duel-speedOptions {
      border: 1px solid var(--pm-gray-400);
      background-color: var(--pm-gray-400);
      color: var(--pm-primary-100);
    }
    .btn-check:checked + .btn-outline-duel-speedOptions,
    .btn-outline-duel-speedOptions.active {
      color: var(--pm-primary-100);
      background-color: var(--pm-primary-500);
      border-color: var(--pm-primary-500);
    }
    .btn-outline-duel-speedOptions:hover {
      background-color: var(--pm-gray-400) !important;
      color: var(--pm-primary-100) !important;
    }
    .btn-check:checked + .btn-outline-duel-speedOptions:hover,
    .btn-outline-duel-speedOptions.active {
      background-color: var(--pm-primary-500) !important;
    }
    .form-check-input,
    .form-check-input:checked,
    .form-check-input:focus,
    .form-check-input:active {
      background-color: var(--pm-gray-400);
      border: none;
      box-shadow: none;
    }
    .form-switch .form-check-input {
      width: 3em;
    }
    .form-switch .form-check-input,
    .form-switch .form-check-input:checked {
      background-image: url("${knobUrl}") !important;
    }
    .modal-footer button {
      color: var(--pm-primary-100) !important;
    }
    </style>
    `;
  }
}

customElements.define('game-options', GameOptions);
