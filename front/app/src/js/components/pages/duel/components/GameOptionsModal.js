import { Modal } from 'bootstrap';

export class GameOptionsModal extends HTMLElement {
  #state = {
    options: {
      scoreToWin: 15, // 3 - 20
      gameSpeed: 'medium', // slow, medium, fast
      isRanked: true,
      timeLimitMinutes: 3, // 1 - 5
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
    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  connectedCallback() {
    this.render();
  }
  
  render() {
    this.innerHTML = this.template() + this.style();
    this.modal = new Modal(this.querySelector('.modal'));
  }
  
  showModal(onConfirmCallback) {
    this._onConfirmCallback = onConfirmCallback;
    if (this.modal) {
      this.modal.show();
    }
  }
  
  handleConfirm() {
    this._onConfirmCallback(this.#state);
    // this.modal.hide();
  }

  handleCancel() {
    this.#state = {
      scoreToWin: 20,
      gameSpeed: 'normal',
      isRanked: true,
      timeLimitMinutes: 3,
    };
  this.innerHTML = '';
    // this.modal.hide();
  }

  template() {
    return `
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content btn-wood">
          <div class="modal-body pt-4">
            <h2 class="text-center">Game Options</h2>
            <div class="form-group d-flex flex-column gap-5">
              <div>
                <label for="score-to-win">Score to Win</label>
                <div class="d-flex justify-content-between align-items-center gap-2">
                  <span>${this.#state.range.minScoreToWin}</span>
                  <input type="range" class="form-range" id="score-to-win" value="${this.#state.options.scoreToWin}" min="${this.#state.range.minScoreToWin}" max="${this.#state.range.maxScoreToWin}" step="1">
                  <span>${this.#state.range.maxScoreToWin}</span>
                </div>
              </div>

              <div class="d-flex flex-column pb-1 gap-2">
                <label>Game Speed</label>
                <div class="btn-group" role="group">
                  <input type="radio" class="btn-check" name="options" id="game-speed-slow" autocomplete="off">
                  <label class="btn btn-outline-duel-options py-0" for="game-speed-slow">slow</label>

                  <input type="radio" class="btn-check" name="options" id="game-speed-medium" autocomplete="off" checked>
                  <label class="btn btn-outline-duel-options py-0" for="game-speed-medium">medium</label>

                  <input type="radio" class="btn-check" name="options" id="game-speed-fast" autocomplete="off">
                  <label class="btn btn-outline-duel-options py-0" for="game-speed-fast">fast</label>
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
                <div class="d-flex justify-content-between align-items-center gap-2">
                  <span>${this.#state.range.minTimeLimit}</span>
                  <input type="range" class="form-range" id="time-limit" value="${this.#state.options.timeLimitMinutes}" min="${this.#state.range.minTimeLimit}" max="${this.#state.range.maxTimeLimit}" step="1">
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
    const knobColor = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-400');
    const knobUrl = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='" + encodeURIComponent(knobColor) + "'/%3e%3c/svg%3e";

    return `
    <style>
    .form-range::-webkit-slider-runnable-track {
      background-color: var(--pm-gray-500);
    }
    .form-range::-webkit-slider-thumb {
      background-color: var(--pm-primary-400);
      border: none;
    }
    .form-range:focus,
    .form-range:active {
      outline: none;
    }
    .form-range::-moz-range-track {
      background-color: var(--pm-primary-400);
    }
    .form-range::-moz-range-thumb {
      background-color: var(--pm-primary-400);
      border: none;
    }
    .btn-outline-duel-options {
      border: 1px solid var(--pm-gray-500);
      background-color: var(--pm-gray-500);
      color: var(--pm-primary-100);
    }
    .btn-check:checked + .btn-outline-duel-options,
    .btn-check:active + .btn-outline-duel-options,
    .btn-outline-duel-options.active {
      background-color: var(--pm-primary-400);
      border-color: var(--pm-primary-400);
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
