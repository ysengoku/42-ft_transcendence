import { formatDateMDY } from '@utils';
import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';

export class TournamentOverview extends HTMLElement {
  #state = {
    tournament_id: '',
    status: '', // ongoing, finished
    tournament: null,
  }

  constructor() {
    super();
  
    this.tournamentName = null;
    this.tournamentStatus = null;
    this.tournamentWinnerWrapper = null;
    this.tournamentWinnerAvatar = null;
    this.tournamentWinnerAlias = null;
    this.tournamentOverviewContent = null;
  }

  setParam(param) {
    this.#state.tournament_id = param.id;
    if (this.#state.tournament_id === '') {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    this.fetchTournamentrData();
  }

  async fetchTournamentrData() {
    // For test
    // this.#state.tournament = await mockTournamentDetail('mockidongoing');
    this.#state.tournament = await mockTournamentDetail('mockidfinished');

    // TODO: Check tournament status
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentStatus = this.querySelector('#tournament-status');
    this.tournamentWinnerWrapper = this.querySelector('#tournament-winner-wrapper');
    this.tournamentWinnerAvatar = this.querySelector('#tournament-winner-avatar');
    this.tournamentWinnerAlias = this.querySelector('#tournament-winner-alias');
    this.tournamentOverviewContent = this.querySelector('#tournament-overview-content');
    let content = null;

    this.tournamentName.textContent = this.#state.tournament.name;
    this.#state.tournament.status === 'ongoing' ? (
      this.tournamentStatus.textContent = 'Ongoing',
      this.tournamentWinnerWrapper.classList.add('d-none'),
      content = document.createElement('tournament-overview-ongoing')
    ) : (
      this.tournamentStatus.textContent = 'Finished on ' + `${formatDateMDY(this.#state.tournament.date)}`,
      this.tournamentWinnerAvatar.src = this.#state.tournament.winner.user.avatar,
      this.tournamentWinnerAlias.textContent = this.#state.tournament.winner.alias,
      content = document.createElement('tournament-overview-finished')
    );
    content.data = {rounds: this.#state.tournament.rounds, status: this.#state.tournament.status};
    this.tournamentOverviewContent.appendChild(content);
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-xl-10 p-3">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4 mb-4">
            <h2 class="text-center m-0 pt-2 w-100" id="tournament-name"></h2>
            <p class="text-center m-0 mb-3 w-100" id="tournament-status"></p>

            <div class="d-flex flex-column justify-content-start align-items-center" id="tournament-winner-wrapper">
              <p class="m-0 py-2 w-100" style="font-family: 'van dyke'">Champion</p>
              <div class="d-flex flex-row justify-content-center align-items-center w-100 gap-2">
                <img id="tournament-winner-avatar" alt="Champion Avatar" class="avatar-m rounded-circle">
                <p class="m-0 fs-5" id="tournament-winner-alias"></p>
              </div>
            </div>
          </div>

          <div id="tournament-overview-content"></div>
          
          <div class="d-flex flex-row justify-content-center mt-5">
            <a href="/tournament-menu" class="btn">
              <i class="bi bi-arrow-left"></i>
              Back to Tournament menu
            </a>
          </div>
          <div class="btn-container d-flex flex-row justify-content-center align-items-center my-2 gap-3">
            <a class="btn btn-wood" href="/home" role="button">Go to Saloon</a>
            <a class="btn btn-wood" role="button">See my Profile</a>
          </div>
        </div>
      </div>  
    </div>
    `;
  }

  style() {
    return `
    <style>
    </style>
    `;
  }
}

customElements.define('tournament-overview', TournamentOverview);
