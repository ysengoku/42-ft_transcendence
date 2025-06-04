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
    const storedOptions = localStorage.getItem('gameOptions');
    console.log('Stored game options:', storedOptions);
    if (storedOptions) {
      this.#state.options = JSON.parse(storedOptions);
    }
    this.render();
  }

  disconnectedCallback() {
    this.localPlayerButton?.removeEventListener('click', this.navigateToGame);
    this.aiPlayerButton?.removeEventListener('click', this.navigateToGame);
  }

  render() {
    this.innerHTML = this.template();

    this.querySelector('.modal-title')?.classList.add('d-none');
    this.querySelector('#is-ranked-selector')?.classList.add('d-none');

    this.localPlayerButton = this.querySelector('#local-game-classic');
    this.aiPlayerButton = this.querySelector('#local-game-ai');

    this.gameOptionsForm = this.querySelector('game-options');
    if (this.#state.options) {
      this.gameOptionsForm.selectedOptions = this.#state.options;
    } else {
      this.gameOptionsForm.renderOptions();
    }
    this.localPlayerButton.addEventListener('click', this.navigateToGame);
    this.aiPlayerButton.addEventListener('click', this.navigateToGame);

    const anyOptions = this.gameOptionsForm.querySelectorAll('.opt-out-option');
    anyOptions.forEach((item) => {
      if (!item.classList.contains('optout-all')) {
        item.classList.add('d-none');
      }
    });
  }

  navigateToGame(event) {
    event.preventDefault();
    this.#state.options = this.gameOptionsForm.selectedOptions;
    const gameType = event.target.id === 'local-game-classic' ? 'classic' : 'ai';
    devLog('Game options:', this.#state.options, ' Game type: ', gameType);
    localStorage.setItem('gameOptions', JSON.stringify(this.#state.options));
    localStorage.setItem('gameType', gameType);
    router.navigate('/singleplayer-game');
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100">
            <div class="w-75">
              <h2 class="text-start m-0 mb-4 pt-2 w-75">Local Game</h2>
              <game-options></game-options>
              <button type="submit" id="local-game-classic" class="btn btn-wood btn-lg mt-5 w-100">Local player battle</button>
              <button type="submit" id="local-game-ai" class="btn btn-wood btn-lg mt-3 mb-5 w-100">AI Challenge</button>
              <game-instruction></game-instruction>
              <div class="d-flex flex-row justify-content-center mt-4">
                <a href="/home" class="btn">
                  <i class="bi bi-arrow-left"></i>
                  Back to Saloon
                </a>
              </div>              
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }
}

customElements.define('local-game-menu', LocalGameMenu);
