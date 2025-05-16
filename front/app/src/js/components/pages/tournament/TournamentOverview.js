import { formatDateMDY } from '@utils';
import { isMobile } from '@utils';
import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';

export class TournamentOverview extends HTMLElement {
  #state = {
    tournament_id: '',
    status: '', // ongoing, finished
    tournament: null,
    isMobile: false,
  }

  constructor() {
    super();
  
    this.tournamentName = null;
    this.tournamentStatus = null;
    this.tournamentWinnerWrapper = null;
    this.tournamentWinnerAvatar = null;
    this.tournamentWinnerAlias = null;
    this.tournamentOverviewContent = null;

    this.#state.isMobile = isMobile();
    this.handleResize = this.handleResize.bind(this);
  }

  setParam(param) {
    this.#state.tournament_id = param.id;
    if (this.#state.tournament_id === '') {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    this.fetchTournamentrData();
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
  }

  async fetchTournamentrData() {
    // For test
    // this.#state.tournament = await mockTournamentDetail('mockidongoing');
    this.#state.tournament = await mockTournamentDetail('mockidongoing2');
    // this.#state.tournament = await mockTournamentDetail('mockidfinished');

    if (!(this.#state.tournament.status === 'ongoing' || this.#state.tournament.status === 'finished')) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
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

    this.tournamentName.textContent = this.#state.tournament.name;
    this.#state.tournament.status === 'ongoing' ? (
      this.tournamentStatus.textContent = 'Ongoing',
      this.tournamentWinnerWrapper.classList.add('d-none')
    ) : (
      this.tournamentStatus.textContent = 'Finished on ' + `${formatDateMDY(this.#state.tournament.date)}`,
      this.tournamentWinnerAvatar.src = this.#state.tournament.winner.user.avatar,
      this.tournamentWinnerAlias.textContent = this.#state.tournament.winner.alias
    );
 
    const content = isMobile() ? document.createElement('tournament-overview-table') : document.createElement('tournament-overview-tree');
    content.data = this.#state.tournament.rounds;
    this.tournamentOverviewContent.appendChild(content);
  }

  handleResize() {
    const isMobileSize = isMobile();
    if (isMobileSize === this.#state.isMobile) {
      return;
    }
    this.#state.isMobile = isMobileSize;
    this.render();
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-lg-12 col-xl-10 p-3">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4 my-3">
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
          
          <div class="d-flex flex-row justify-content-center mt-4">
            <a href="/tournament-menu" class="btn">
              <i class="bi bi-arrow-left"></i>
              Back to Tournament menu
            </a>
          </div>
          <div class="btn-container d-flex flex-row justify-content-center align-items-center mt-3 mb-4 gap-2">
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
    .bracket-player {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: .4rem;
      margin-top: .1rem;
      margin-bottom: .1rem;
    }
    .bracket-player-winner {
      .bracket-player {
        background-color: var(--pm-primary-500);
      }
      .player-alias {
        color: var(--pm-primary-100);
      }
    }
    .bracket-player-loser {
      opacity: 0.5;
    }
    .player-alias {
      font-size: 0.8rem;
      min-width: 96px;
    }
    </style>
    `;
  }
}

customElements.define('tournament-overview', TournamentOverview);
