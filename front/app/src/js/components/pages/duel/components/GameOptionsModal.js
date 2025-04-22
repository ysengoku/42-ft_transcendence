import { Modal } from 'bootstrap';

export class GameOptionsModal extends HTMLElement {
  #state = {
    selectedOptions: null,
    // TODO: set default values
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
    this.modal = null;
    this._onConfirmCallback = null;

    this.updateOptions = this.updateOptions.bind(this);
    this.updateSelectedValue = this.updateSelectedValue.bind(this);
    this.confirmOptions = this.confirmOptions.bind(this);
    this.cancelOptionsSelection = this.cancelOptionsSelection.bind(this);
  }

  connectedCallback() {
    if (!this.#state.selectedOptions) {
      this.#state.selectedOptions = this.#state.defaultOptions;
    }
    this.render();
    this.modal = new Modal(this.querySelector('.modal'));
  }

  disconnectedCallback() {
    this.scoreToWinInput?.removeEventListener('input', this.updateOptions);
    this.scoreToWinInput?.removeEventListener('input', this.updateSelectedValue);
    this.gameSpeedInputs.forEach((input) => {
      input?.removeEventListener('change', this.updateOptions);
    });
    this.isRankedInput?.removeEventListener('change', this.updateOptions);
    this.timeLimitInput?.removeEventListener('input', this.updateOptions);
    this.timeLimitInput?.removeEventListener('input', this.updateSelectedValue);
    this.confirmButton?.removeEventListener('click', this.confirmOptions);
    this.cancelButton?.removeEventListener('click', this.cancelOptionsSelection);

    this.innerHTML = '';
    this.modal = null;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.duelMenuComponent = document.querySelector('duel-menu');
    this.scoreToWinInput = this.querySelector('#score-to-win');
    this.gameSpeedInputs = this.querySelectorAll('input[name="speedOptions"]');
    this.isRankedInput = this.querySelector('#is-ranked');
    this.timeLimitInput = this.querySelector('#time-limit');
    this.confirmButton = this.querySelector('.confirm-button');
    this.cancelButton = this.querySelector('.cancel-button');

    this.scoreToWinInput.addEventListener('input', this.updateOptions);
    this.scoreToWinInput.addEventListener('input', this.updateSelectedValue);
    this.gameSpeedInputs.forEach((input) => {
      input.addEventListener('change', this.updateOptions);
    });
    this.isRankedInput.addEventListener('change', this.updateOptions);
    this.timeLimitInput.addEventListener('input', this.updateOptions);
    this.timeLimitInput.addEventListener('input', this.updateSelectedValue);
    this.confirmButton.addEventListener('click', this.confirmOptions);
    this.cancelButton.addEventListener('click', this.cancelOptionsSelection);

    const scoreToWinOutput = this.scoreToWinInput.nextElementSibling;
    if (scoreToWinOutput) {
      scoreToWinOutput.value = this.scoreToWinInput.value;
      const pos =
        ((this.#state.defaultOptions.scoreToWin - this.#state.range.minScoreToWin) * 100) /
          (this.#state.range.maxScoreToWin - this.#state.range.minScoreToWin);
      scoreToWinOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
    }
    const selectedGameSpeed = this.#state.selectedOptions.gameSpeed;
    const selectedGameSpeedInput = this.querySelector(`input[name="speedOptions"][value="${selectedGameSpeed}"]`);
    if (selectedGameSpeedInput) {
      selectedGameSpeedInput.checked = true;
    }
    this.#state.selectedOptions.isRanked ? this.isRankedInput.checked = true : this.isRankedInput.checked = false;
    const timeLimitOutput = this.timeLimitInput.nextElementSibling;
    if (timeLimitOutput) {
      timeLimitOutput.value = this.timeLimitInput.value;
      const pos =
      ((this.#state.defaultOptions.maxTimeLimit - this.#state.range.minTimeLimit) * 100) /
        (this.#state.range.maxScoreToWin - this.#state.range.minTimeLimit);
      timeLimitOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
    }
  }

  showModal(onConfirmCallback) {
    this._onConfirmCallback = onConfirmCallback;
    if (this.modal) {
      this.modal.show();
    }
  }

  setOptions(options) {
    if (options) {
      this.#state.selectedOptions = options;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */

  confirmOptions() {
    this._onConfirmCallback(this.#state.selectedOptions);
    this.duelMenuComponent?.removeChild(this);
  }

  cancelOptionsSelection() {
    this.#state = {
      scoreToWin: 20,
      gameSpeed: 'normal',
      isRanked: true,
      timeLimitMinutes: 3,
    };
    this.duelMenuComponent?.removeChild(this);
  }

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

  updateSelectedValue(event) {
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
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content btn-wood">
          <div class="modal-header border-0">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-4">
            <h2 class="text-center pb-4">Game Options</h2>
            <div class="form-group d-flex flex-column gap-5">
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

              <div class="d-flex flex-column pb-1 gap-2">
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
              
              <div>
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
          </div>

          <div class="modal-footer border-0 mt-4">
            <button type="button" class="cancel-button btn" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder fs-5" data-bs-dismiss="modal">Save choice</button>
          </div>
        </div>
      <div>
    </div>
    `;
  }

  style() {
    const knobColor = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500');
    const knobUrl =
      'data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\'' +
      ' viewBox=\'-4 -4 8 8\'%3e%3ccircle r=\'3\' fill=\'' +
      encodeURIComponent(knobColor) + '\'/%3e%3c/svg%3e';

    return `
    <style>
    .range-wrapper {
      position: relative;
      margin: 0 auto 2rem;
      output {
        position: absolute;
        padding: 0 0.5rem;
        top: 1.75rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(var(--pm-primary-500-rgb), 0.4);
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
      background-color: var(--pm-gray-500);
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
      border: 1px solid var(--pm-gray-500);
      background-color: var(--pm-gray-500);
      color: var(--pm-primary-100);
    }
    .btn-check:checked + .btn-outline-duel-speedOptions,
    .btn-check:active + .btn-outline-duel-speedOptions,
    .btn-outline-duel-speedOptions.active {
      background-color: var(--pm-primary-500);
      border-color: var(--pm-primary-500);
    }
    .form-check-input,
    .form-check-input:checked,
    .form-check-input:focus,
    .form-check-input:active {
      background-color: var(--pm-gray-500);
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

customElements.define('game-options-modal', GameOptionsModal);
