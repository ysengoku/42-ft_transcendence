import { router } from '@router';

export class TournamentCanceled extends HTMLElement {
  #state = {
    creatorUsername: '',
  };

  constructor() {
    super();
    this.creatorUsernameElement = null;
    this.goToHomeButton = null;
    this.goToTournamentMenuButton = null;

    this.redirectToHome = this.redirectToHome.bind(this);
    this.redirectToTournamentMenu = this.redirectToTournamentMenu.bind(this);
  }

  set data(data) {
    this.#state.creatorUsername = data.creatorUsername;
    this.render();
  }

  disconnectedCallback() {
    this.goToHomeButton?.removeEventListener('click', this.redirectToHome);
    this.goToTournamentMenuButton?.removeEventListener('click', this.redirectToTournamentMenu);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();

    this.creatorUsernameElement = this.querySelector('#creator-alias');
    this.goToHomeButton = this.querySelector('#go-to-home-button');
    this.goToTournamentMenuButton = this.querySelector('#go-to-tournament-menu-button');

    this.creatorUsernameElement.textContent = this.#state.creatorUsername;
    this.goToHomeButton.addEventListener('click', this.redirectToHome);
    this.goToTournamentMenuButton.addEventListener('click', this.redirectToTournamentMenu);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  redirectToHome() {
    router.redirect('/home');
  }

  redirectToTournamentMenu() {
    router.redirect('/tournament-menu');
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
      <div class="d-flex flex-row justify-content-center align-items-center fs-4 mb-3">
        <p id="creator-alias"></p>
        <p>&nbsp; called off this tournament.</p>
      </div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn" id="go-to-home-button">Back to Saloon</div>
        <div class="btn" id="go-to-tournament-menu-button">Find another tournament</div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-canceled', TournamentCanceled);
