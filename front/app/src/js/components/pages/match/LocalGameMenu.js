import { router } from '@router';

export class LocalGameMenu extends HTMLElement {
  #state = {
    options: null,
  };

  constructor() {
    super();
    this.navigateToGame = this.navigateToGame.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.localPlayerButton?.removeEventListener('click', this.navigateToGame);
    this.aiPlayerButton?.removeEventListener('click', this.navigateToGame);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.querySelector('.modal-title')?.classList.add('d-none');
    this.querySelector('#is-ranked-selector')?.classList.add('d-none');

    this.localPlayerButton = this.querySelector('#local-game-classic');
    this.aiPlayerButton = this.querySelector('#local-game-ai');

    this.gameOptionsForm = this.querySelector('game-options');
    this.localPlayerButton.addEventListener('click', this.navigateToGame);
    this.aiPlayerButton.addEventListener('click', this.navigateToGame);
  }

  navigateToGame(event) {
    event.preventDefault();
    this.#state.options = this.gameOptionsForm.selectedOptions;
    if (this.#state.options) {
      this.#state.options.isRanked = false;
    }
    const gameType = event.target.id === 'local-game-classic' ? 'classic' : 'ai';
    devLog('Game options:', this.#state.options, ' Game type: ', gameType);
    router.navigate('/singleplayer-game');
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100">
            <div class="w-75">
              <h2 class="text-start m-0 py-2 w-75">Local Game</h2>
              <p class="fs-5 fw-bolder m-0 my-3">Game Options</p>
              <game-options></game-options>
              <button type="submit" id="local-game-classic" class="btn btn-wood btn-lg mt-5 w-100">Local player battle</button>
              <button type="submit" id="local-game-ai" class="btn btn-wood btn-lg my-4 w-100">AI Challenge</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  style() {
    return ``;
  }
}

customElements.define('local-game-menu', LocalGameMenu);
