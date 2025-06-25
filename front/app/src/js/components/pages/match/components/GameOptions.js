import { DEFAULT_GAME_OPTIONS } from '@env';

export class GameOptions extends HTMLElement {
  #state = {
    selectedOptions: null,
    defaultOptionValue: null,
    range: {
      minScoreToWin: 3,
      maxScoreToWin: 20,
      minTimeLimit: 1,
      maxTimeLimit: 5,
    },
  };

  constructor() {
    super();
    this.duelMenuComponent = null;
    this.optionWrapper = null;
    this.scoreToWinInput = null;
    this.gameSpeedInputs = null;
    this.timeLimitInput = null;
    this.isRankedInput = null;
    this.coolModeInput = null;
    this.allOptionsoptout = null;
    this.scoreToWinOptout = null;
    this.gameSpeedOptout = null;
    this.timeLimitOptout = null;
    this.isRankedOptout = null;
    this.coolModeOptout = null;

    const defaultOptions = DEFAULT_GAME_OPTIONS ? JSON.parse(DEFAULT_GAME_OPTIONS) : {};
    this.#state.defaultOptionValue = {
      score_to_win: defaultOptions.scoreToWin || 5,
      game_speed: defaultOptions.gameSpeed || 'medium',
      time_limit: defaultOptions.timeLimit || 3,
      ranked: defaultOptions.isRanked || false,
      cool_mode: defaultOptions.coolMode || false,
    };

    this.updateOptions = this.updateOptions.bind(this);
    this.updateSelectedValueOnRange = this.updateSelectedValueOnRange.bind(this);
    this.toggleOptoutAllOptions = this.toggleOptoutAllOptions.bind(this);
    this.toggleOptionOptout = this.toggleOptionOptout.bind(this);
  }

  connectedCallback() {
    this.#state.selectedOptions = this.getOptionsFromLocalStorage();
    if (!this.#state.selectedOptions || Object.keys(this.#state.selectedOptions).length === 0) {
      this.#state.selectedOptions = {
        ...this.#state.defaultOptionValue,
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
    this.timeLimitInput?.removeEventListener('input', this.updateOptions);
    this.timeLimitInput?.removeEventListener('input', this.updateSelectedValueOnRange);
    this.isRankedInput?.removeEventListener('change', this.updateOptions);
    this.coolModeInput?.removeEventListener('change', this.updateOptions);
    this.allOptionsoptout?.removeEventListener('change', this.toggleOptoutAllOptions);
    this.scoreToWinOptout?.removeEventListener('change', this.toggleOptionOptout);
    this.gameSpeedOptout?.removeEventListener('change', this.toggleOptionOptout);
    this.timeLimitOptout?.removeEventListener('change', this.toggleOptionOptout);
    this.isRankedOptout?.removeEventListener('change', this.toggleOptionOptout);
    this.coolModeOptout?.removeEventListener('change', this.toggleOptionOptout);

    this.innerHTML = '';
    this.modal = null;
  }

  get selectedOptions() {
    this.storeOptionstoLocalStorage();
    return this.#state.selectedOptions;
  }

  get selectedOptionsObject() {
    this.storeOptionstoLocalStorage();
    if (Object.keys(this.#state.selectedOptions).length === 0) {
      return null;
    }
    const optionsObj = {};
    for (const [key, value] of Object.entries(this.#state.selectedOptions)) {
      if (value !== 'any') {
        optionsObj[key] = value;
      }
    }
    return optionsObj;
  }

  getOptionsFromLocalStorage() {
    const storedOptions = localStorage.getItem('gameOptions');
    return storedOptions ? JSON.parse(storedOptions) : null;
  }

  storeOptionstoLocalStorage() {
    if (!this.#state.selectedOptions) {
      return;
    }
    localStorage.setItem('gameOptions', JSON.stringify(this.#state.selectedOptions));
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();

    this.duelMenuComponent = document.querySelector('duel-menu');
    this.optionWrapper = this.querySelector('.form-group');
    this.scoreToWinInput = this.querySelector('#score-to-win');
    this.gameSpeedInputs = this.querySelectorAll('input[name="speed-options"]');
    this.timeLimitInput = this.querySelector('#time-limit');
    this.isRankedInput = this.querySelector('#is-ranked');
    this.coolModeInput = this.querySelector('#cool-mode');
    this.allOptionsoptout = this.querySelector('#optout-gameOptions');
    this.scoreToWinOptout = this.querySelector('#optout-score_to_win');
    this.gameSpeedOptout = this.querySelector('#optout-game_speed');
    this.timeLimitOptout = this.querySelector('#optout-time_limit');
    this.isRankedOptout = this.querySelector('#optout-ranked');
    this.coolModeOptout = this.querySelector('#optout-cool_mode');

    this.renderOptions();

    // Input event handlers
    this.scoreToWinInput.addEventListener('input', this.updateOptions);
    this.scoreToWinInput.addEventListener('input', this.updateSelectedValueOnRange);
    this.gameSpeedInputs.forEach((input) => {
      input.addEventListener('change', this.updateOptions);
    });
    this.timeLimitInput.addEventListener('input', this.updateOptions);
    this.timeLimitInput.addEventListener('input', this.updateSelectedValueOnRange);
    this.isRankedInput.addEventListener('change', this.updateOptions);
    this.coolModeInput.addEventListener('change', this.updateOptions);

    // Optout event handlers
    this.allOptionsoptout.addEventListener('change', this.toggleOptoutAllOptions);
    this.scoreToWinOptout.addEventListener('change', this.toggleOptionOptout);
    this.gameSpeedOptout.addEventListener('change', this.toggleOptionOptout);
    this.timeLimitOptout.addEventListener('change', this.toggleOptionOptout);
    this.isRankedOptout.addEventListener('change', this.toggleOptionOptout);
    this.coolModeOptout.addEventListener('change', this.toggleOptionOptout);
  }

  allOptionsOptout() {
    return (
      this.#state.selectedOptions.score_to_win === 'any' &&
      this.#state.selectedOptions.game_speed === 'any' &&
      this.#state.selectedOptions.time_limit === 'any' &&
      this.#state.selectedOptions.ranked === 'any' &&
      this.#state.selectedOptions.cool_mode === 'any'
    );
  }

  renderOptions() {
    if (this.allOptionsOptout()) {
      this.optionWrapper.classList.add('d-none');
      this.allOptionsoptout.checked = true;
      return;
    }
    if (this.#state.selectedOptions.score_to_win === 'any') {
      this.scoreToWinOptout.checked = true;
      const input = this.scoreToWinInput.closest('.option-input');
      input.classList.add('d-none');
    } else {
      this.renderOption('score_to_win');
    }
    if (this.#state.selectedOptions.game_speed === 'any') {
      this.gameSpeedOptout.checked = true;
      const input = this.gameSpeedInputs[0].closest('.option-input');
      input.classList.add('d-none');
    } else {
      this.renderOption('game_speed');
    }
    if (this.#state.selectedOptions.time_limit === 'any') {
      this.timeLimitOptout.checked = true;
      const input = this.timeLimitInput.closest('.option-input');
      input.classList.add('d-none');
    } else {
      this.renderOption('time_limit');
    }
    if (this.#state.selectedOptions.ranked === 'any') {
      this.isRankedOptout.checked = true;
      const input = this.isRankedInput.closest('.option-input');
      input.classList.add('d-none');
    } else {
      this.renderOption('ranked');
    }
    if (this.#state.selectedOptions.cool_mode === 'any') {
      this.coolModeOptout.checked = true;
      const input = this.coolModeInput.closest('.option-input');
      input.classList.add('d-none');
    } else {
      this.renderOption('cool_mode');
    }
  }

  renderOption(id) {
    switch (id) {
      case 'score_to_win':
        this.scoreToWinInput.value =
          this.#state.selectedOptions.score_to_win || this.#state.defaultOptionValue.score_to_win;
        const scoreToWinOutput = this.scoreToWinInput.nextElementSibling;
        if (scoreToWinOutput) {
          scoreToWinOutput.value = this.scoreToWinInput.value;
          const pos =
            ((this.scoreToWinInput.value - this.#state.range.minScoreToWin) * 100) /
            (this.#state.range.maxScoreToWin - this.#state.range.minScoreToWin);
          scoreToWinOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
        }
        break;
      case 'game_speed':
        const selectedGameSpeed = this.#state.selectedOptions.game_speed;
        const selectedGameSpeedInput = this.querySelector(`input[name="speed-options"][value="${selectedGameSpeed}"]`);
        if (selectedGameSpeedInput) {
          selectedGameSpeedInput.checked = true;
        }
        break;
      case 'time_limit':
        this.timeLimitInput.value = this.#state.selectedOptions.time_limit || this.#state.defaultOptionValue.time_limit;
        const timeLimitOutput = this.timeLimitInput.nextElementSibling;
        if (timeLimitOutput) {
          timeLimitOutput.value = this.timeLimitInput.value;
          const pos =
            ((this.timeLimitInput.value - this.#state.range.minTimeLimit) * 100) /
            (this.#state.range.maxTimeLimit - this.#state.range.minTimeLimit);
          timeLimitOutput.style.left = `calc(${pos}% + (${8 - pos * 0.15}px))`;
        }
        break;
      case 'ranked':
        this.#state.selectedOptions.ranked ? (this.isRankedInput.checked = false) : (this.isRankedInput.checked = true);
        break;
      case 'cool_mode':
        this.#state.selectedOptions.cool_mode
          ? (this.coolModeInput.checked = false)
          : (this.coolModeInput.checked = true);
        break;
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
      this.#state.selectedOptions.score_to_win = parseInt(target.value);
    } else if (target.name === 'speed-options') {
      this.#state.selectedOptions.game_speed = target.value;
    } else if (target.id === 'time-limit') {
      this.#state.selectedOptions.time_limit = parseInt(target.value);
    } else if (target.id === 'is-ranked') {
      this.#state.selectedOptions.ranked = !target.checked;
    } else if (target.id === 'cool-mode') {
      this.#state.selectedOptions.cool_mode = !target.checked;
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

  toggleOptionOptout(event) {
    const target = event.target;
    const optionWrapper = target.closest('.option-input-wrapper');
    const input = optionWrapper.querySelector('.option-input');
    target.checked ? input.classList.add('d-none') : input.classList.remove('d-none');

    const id = target.id.replace('optout-', '');
    this.#state.selectedOptions[id] = target.checked ? 'any' : this.#state.defaultOptionValue[id];
    if (!target.checked) {
      this.renderOption(id);
    }
  }

  toggleOptoutAllOptions(event) {
    if (event.target.checked) {
      this.optionWrapper.classList.add('d-none');
      this.#state.selectedOptions = {
        score_to_win: 'any',
        game_speed: 'any',
        time_limit: 'any',
        ranked: 'any',
        cool_mode: 'any',
      };
    } else {
      this.optionWrapper.classList.remove('d-none');
      this.#state.selectedOptions = this.#state.defaultOptionValue;
      this.renderOptions();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */

  template() {
    return `
    <! -- Optout All Options -->
    <div class="optout-option optout-all form-check pt-1 mb-5 fs-5">
      <input class="form-check-input" type="checkbox" id="optout-gameOptions">
      <label class="form-check-label fw-bold" for="optout-gameOptions">
        Deactivate All Options
      </label>
    </div>

    <div class="form-group d-flex flex-column gap-4">

      <! -- Score to Win -->
      <div class="option-input-wrapper pb-2">
        <div class="d-flex justify-content-between pb-1">
          <label for="score-to-win" class="fs-5">Score to Win</label>
          <div class="optout-option form-check pt-1">
            <input class="form-check-input" type="checkbox" id="optout-score_to_win">
            <label class="form-check-label" for="optout-score_to_win">
              I don't care
            </label>
          </div>
        </div>
        <div class="option-input d-flex align-items-start gap-2">
          <span class="pt-1">${this.#state.range.minScoreToWin}</span>
          <div class="range-wrapper flex-grow-1 pt-1">
            <input type="range" class="form-range" id="score-to-win"
              min="${this.#state.range.minScoreToWin}" max="${this.#state.range.maxScoreToWin}" step="1">
            <output></output>
          </div>
          <span class="pt-1">${this.#state.range.maxScoreToWin}</span>
        </div>
      </div>

      <! -- Game Speed -->
      <div class="option-input-wrapper d-flex flex-column pb-3 gap-2">
        <div class="d-flex justify-content-between mt-2 pb-1">
          <label for="game-speed" class="fs-5">Game Speed</label>
          <div class="optout-option form-check pt-1">
            <input class="form-check-input" type="checkbox" id="optout-game_speed">
            <label class="form-check-label" for="optout-game_speed">
              I don't care
            </label>
          </div>
        </div>
        <div class="option-input btn-group" role="group" id="game-speed">
          <input type="radio" class="btn-check" name="speed-options" id="game-speed-slow" value="slow" autocomplete="off">
          <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-slow">slow</label>

          <input type="radio" class="btn-check" name="speed-options" id="game-speed-medium" value="medium" autocomplete="off" checked>
          <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-medium">medium</label>

          <input type="radio" class="btn-check" name="speed-options" id="game-speed-fast" value="fast" autocomplete="off">
	      <label class="btn btn-outline-duel-speedOptions py-0" for="game-speed-fast">fast</label>
        </div>
      </div>

      <! -- Time Limit -->
      <div class="option-input-wrapper">
        <div class="d-flex justify-content-between mt-2 pb-1">
          <label for="time-limit" class="fs-5">Time Limit</label>
          <div class="optout-option form-check pt-1">
            <input class="form-check-input" type="checkbox" id="optout-time_limit">
            <label class="form-check-label" for="optout-time_limit">
              I don't care
            </label>
          </div>
        </div>
        <div class="option-input d-flex align-items-start gap-2">
          <span class="pt-1">${this.#state.range.minTimeLimit} min</span>
          <div class="range-wrapper flex-grow-1 pt-1">
            <input type="range" class="form-range" id="time-limit"
              min="${this.#state.range.minTimeLimit}" max="${this.#state.range.maxTimeLimit}" step="1">
            <output></output>
          </div>
          <span class="pt-1">${this.#state.range.maxTimeLimit} min</span>
        </div>
      </div>

      <! -- Ranked -->
      <div class="option-input-wrapper pb-3" id="is-ranked-selector">
        <div class="d-flex justify-content-between mt-2 pb-1">
          <label for="is-ranked" class="fs-5">Ranked</label>
          <div class="optout-option form-check pt-1">
            <input class="form-check-input" type="checkbox" id="optout-ranked">
            <label class="form-check-label" for="optout-ranked">
              I don't care
            </label>
          </div>
        </div>
        <div class="option-input d-flex align-items-center gap-2">
          <p class="pe-2 m-0 fs-6 fw-lighter">Enable</p>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="is-ranked">
          </div>
          <p class="ps-2 m-0 fs-6 fw-lighter">Disable</p>
        </div>
      </div>

      <! -- Cool Mode -->
      <div class="option-input-wrapper pb-3" id="cool-mode-selector">
        <div class="d-flex justify-content-between mt-2 pb-1">
          <label for="cool-mode" class="fs-5">Buffs</label>
          <div class="optout-option form-check pt-1">
            <input class="form-check-input" type="checkbox" id="optout-cool_mode">
            <label class="form-check-label" for="optout-cool_mode">
              I don't care
            </label>
          </div>
        </div>
        <div class="option-input d-flex align-items-center gap-2">
          <p class="pe-2 m-0 fs-6 fw-lighter">Enable</p>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="cool-mode" checked>
          </div>
          <p class="ps-2 m-0 fs-6 fw-lighter">Disable</p>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    const knobColor = getComputedStyle(document.documentElement).getPropertyValue('--pm-primary-500');
    const knobUrl =
      "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg'" +
      " viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='" +
      encodeURIComponent(knobColor) +
      "'/%3e%3c/svg%3e";

    return `
    <style>
    game-options {
      display: block;
      flex-shrink: 0;
    }
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
      border: 1px solid var(--pm-gray-500);
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
    .optout-option {
      .form-check-input {
        background-color: rgba(var(--pm-primary-100-rgb), 0.3);
        border: 1px solid rgba(var(--pm-primary-100-rgb), 0.9);
      }
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
