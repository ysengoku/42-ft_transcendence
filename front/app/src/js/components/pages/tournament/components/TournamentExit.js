import { router } from '@router';
import { UI_STATUS } from '../tournamentStatus';

export class TournamentExit extends HTMLElement {
  #state = {
    status: '',
    tournamentId: '',
    creatorAlias: '',
  };

  constructor() {
    super();
    this.message = null;
    this.creatorUsernameElement = null;
    this.goToHomeButton = null;
    this.goToTournamentMenuButton = null;

    this.redirectToHome = this.redirectToHome.bind(this);
    this.redirectToTournamentMenu = this.redirectToTournamentMenu.bind(this);
    this.redirectToTournamentOverview = this.redirectToTournamentOverview.bind(this);
  }

  set data(data) {
    this.#state.status = data.status;
    this.#state.tournamentId = data.tournamentId;
    this.#state.creatorAlias = data.creatorAlias;
    this.render();
  }

  disconnectedCallback() {
    this.goToHomeButton?.removeEventListener('click', this.redirectToHome);
    this.goToTournamentMenuButton?.removeEventListener('click', this.redirectToTournamentMenu);
    this.goToTournamentOverviewButton?.removeEventListener('click', this.redirectToTournamentOverview);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();

    this.message = this.querySelector('#tournament-exit-message');
    this.creatorUsernameElement = this.querySelector('#creator-alias');
    this.goToHomeButton = this.querySelector('#go-to-home-button');
    this.goToTournamentMenuButton = this.querySelector('#go-to-tournament-menu-button');
    this.goToTournamentOverviewButton = this.querySelector('#go-to-tournament-overview-button');

    switch (this.#state.status) {
      case UI_STATUS.ELIMINATED:
        this.message.textContent = "You've been eliminated.";
        this.goToTournamentOverviewButton.addEventListener('click', this.redirectToTournamentOverview);
        this.goToHomeButton.classList.add('d-none');
        this.goToTournamentMenuButton.classList.add('d-none');
        return;
      case UI_STATUS.CANCELED:
        this.message.textContent = `${this.#state.creatorAlias} called off this tournament.`;
        break;
      case UI_STATUS.ERROR:
        this.message.textContent = 'Oops! Something went wrong.';
        break;
    }
    this.goToHomeButton.addEventListener('click', this.redirectToHome);
    this.goToTournamentMenuButton.addEventListener('click', this.redirectToTournamentMenu);
    this.goToTournamentOverviewButton.classList.add('d-none');
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

  redirectToTournamentOverview() {
    router.redirect(`tournament-overview/${this.#state.tournament_id}`);
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
      <div class="d-flex flex-row justify-content-center align-items-center fs-4 mb-3" id="tournament-exit-message"></div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn" id="go-to-home-button">Back to Saloon</div>
        <div class="btn" id="go-to-tournament-menu-button">Find another tournament</div>
        <div class="btn" id="go-to-tournament-overview-button">Check tournament status</div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-exit', TournamentExit);
