import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';

export class TournamentOverview extends HTMLElement {
  #state = {
    tournament_id: '',
    tournament: null,
  }

  constructor() {
    super();
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
    this.#state.tournament = await mockTournamentDetail('finished');
    console.log(this.#state.tournament_id, this.#state.tournament);

    // TODO: Check tournament status
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentStatus = this.querySelector('#tournament-status');
    this.tournamentWinnerAvatar = this.querySelector('#tournament-winner-avatar');
    this.tournamentWinnerAlias = this.querySelector('#tournament-winner-alias');

    this.tournamentName.textContent = this.#state.tournament.name;
    this.tournamentStatus.textContent = this.#state.tournament.status; // TODO: Add date if finished
    this.tournamentWinnerAvatar.src = this.#state.tournament.winner.user.avatar;
    this.tournamentWinnerAlias.textContent = this.#state.tournament.winner.alias;
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-12 col-lg-10 col-xl-6 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4">
            <h2 class="text-center m-0 py-2 w-100" id="tournament-name"></h2>
            <p class="text-center m-0 pb-2 w-100" id="tournament-status"></p>
            <div class="d-flex flex-column justify-content-start align-items-center">
              <p class="m-0 py-2 w-100 fw-bold">Champion</h3>
              <div class="d-flex flex-row justify-content-center align-items-center w-100 gap-2">
                <img id="tournament-winner-avatar" alt="Champion Avatar" class="avatar-m rounded-circle">
                <p class="m-0 fs-4" id="tournament-winner-alias"></p>
              </div>
            </div>

          </div>
          
          <div class="d-flex flex-row justify-content-center mt-5">
            <a href="/tournament-menu" class="btn">
              <i class="bi bi-arrow-left"></i>
              Back to Tournament list
            </a>
          </div>
          <div class="btn-container d-flex flex-row justify-content-center align-items-center my-2 gap-3">
            <a class="btn btn-wood" href="/home" role="button">Go to Home</a>
            <a class="btn btn-wood" role="button">Go to Profile</a>
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
