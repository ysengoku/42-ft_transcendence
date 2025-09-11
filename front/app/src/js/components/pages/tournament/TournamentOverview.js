/**
 * @module TournamentOverview
 * @description Displays the tournament result if it's finished and the current status if ongoing.
 * For the window size larger than Breakpoint MD, it displays tournament tree, otherwise brackets table.
 */

import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { formatDateMDY, sessionExpiredToast, isMobile } from '@utils';
import { TOURNAMENT_STATUS } from './tournamentStatus.js';

export class TournamentOverview extends HTMLElement {
  #state = {
    tournament_id: '',
    status: '',
    tournament: null,
    username: '',
    isMobile: false,
    updating: false,
  };

  #pollingInterval = null;

  constructor() {
    super();

    this.tournamentName = null;
    this.tournamentStatus = null;
    this.tournamentWinnerWrapper = null;
    this.tournamentWinnerAvatar = null;
    this.tournamentWinnerAlias = null;
    this.tournamentOverviewContent = null;

    this.#state.isMobile = isMobile();
    this.updateStatus = this.updateStatus.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  async setParam(param) {
    this.#state.tournament_id = param.id;
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 429) {
        return;
      }
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    this.#state.username = authStatus.response.username;
    if (this.#state.tournament_id === '') {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    await this.fetchTournamentData();
    if (this.#state.tournament) {
      this.render();
      this.startPolling();
    }
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
    this.updateButton?.removeEventListener('click', this.fetchTournamentData);
    this.stopPolling();
  }

  async fetchTournamentData() {
    if (this.#state.updating) {
      return;
    }
    this.#state.updating = true;
    this.updateIcon?.classList.add('rotating');
    if (this.updateButtonText) {
      this.updateButtonText.textContent = ' Updating';
    }

    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT(this.#state.tournament_id),
      null,
      false,
      true,
    );
    if (!response.success) {
      if (response.status === 404) {
        const notFound = document.createElement('page-not-found');
        this.innerHTML = notFound.outerHTML;
      }
      this.#state.updating = false;
      return;
    }
    this.#state.tournament = response.data;

    if (
      this.#state.tournament.status !== TOURNAMENT_STATUS.ONGOING &&
      this.#state.tournament.status !== TOURNAMENT_STATUS.FINISHED
    ) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      this.#state.updating = false;
      return;
    }

    if (this.#state.tournament.status === TOURNAMENT_STATUS.FINISHED) {
      this.stopPolling();
    }

    setTimeout(() => {
      this.updateIcon?.classList.remove('rotating');
      if (this.updateButtonText) {
        this.updateButtonText.textContent = ' Update the status';
      }
    }, 800);
    this.#state.updating = false;
  }

  render() {
    this.innerHTML = '';
    this.innerHTML = this.style() + this.template();

    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentStatus = this.querySelector('#tournament-status');
    this.updateButton = this.querySelector('.update-tournament-status-button');
    this.updateIcon = this.querySelector('.bi-arrow-clockwise');
    this.updateButtonText = this.querySelector('.update-button-text');
    this.tournamentWinnerWrapper = this.querySelector('#tournament-winner-wrapper');
    this.tournamentWinnerAvatar = this.querySelector('#tournament-winner-avatar');
    this.tournamentWinnerAlias = this.querySelector('#tournament-winner-alias');
    this.tournamentOverviewContent = this.querySelector('#tournament-overview-content');

    this.tournamentName.textContent = this.#state.tournament.name;
    if (this.#state.tournament.status === TOURNAMENT_STATUS.ONGOING) {
      this.updateButton.addEventListener('click', this.updateStatus);
      this.updateButtonText.textContent = ' Update the status';
    }
    this.renderBracketUpdates();
  }

  renderBracketUpdates() {
    if (this.#state.tournament.status === TOURNAMENT_STATUS.ONGOING) {
      this.tournamentStatus.textContent = 'Ongoing';
      this.tournamentWinnerWrapper.classList.add('d-none');
    } else if (this.#state.tournament.status === TOURNAMENT_STATUS.FINISHED) {
      this.tournamentStatus.textContent = 'Finished on ' + `${formatDateMDY(this.#state.tournament.date)}`;
      this.updateButton.classList.add('d-none');
      this.updateButton?.removeEventListener('click', this.updateStatus);
      if (this.#state.tournament.winner) {
        this.tournamentWinnerAvatar.src = this.#state.tournament.winner.profile.avatar;
        this.tournamentWinnerAlias.textContent = this.#state.tournament.winner.alias;
      }
    }

    const content = isMobile()
      ? document.createElement('tournament-overview-table')
      : document.createElement('tournament-overview-tree');
    content.data = this.#state.tournament.rounds;
    this.tournamentOverviewContent.innerHTML = '';
    this.tournamentOverviewContent.appendChild(content);
  }

  startPolling() {
    this.stopPolling();
    if (this.#state.tournament.status !== TOURNAMENT_STATUS.ONGOING) {
      return;
    }
    this.#pollingInterval = setInterval(async () => {
      if (this.#state.tournament?.status !== TOURNAMENT_STATUS.ONGOING) {
        this.stopPolling();
        return;
      }
      await this.fetchTournamentData();
      if (this.#state.tournament) {
        if (this.#state.tournament.status === TOURNAMENT_STATUS.FINISHED) {
          this.render();
        } else {
          this.renderBracketUpdates();
        }
      }
    }, 30000);
    log.info('Tournament status polling started');
  }

  stopPolling() {
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
      this.#pollingInterval = null;
      log.info('Tournament status polling stopped');
    }
  }

  async updateStatus() {
    await this.fetchTournamentData();
    if (this.#state.tournament) {
      if (this.#state.tournament.status === TOURNAMENT_STATUS.FINISHED) {
        this.render();
      } else {
        this.renderBracketUpdates();
      }

      if (this.#state.tournament.status === TOURNAMENT_STATUS.ONGOING && !this.#pollingInterval) {
        this.startPolling();
      }
    }
  }

  handleResize() {
    const isMobileSize = isMobile();
    if (isMobileSize === this.#state.isMobile) {
      return;
    }
    this.#state.isMobile = isMobileSize;
    this.renderBracketUpdates();
  }

  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-lg-12 col-xl-10 p-3">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4 my-3">
            <h2 class="text-center m-0 pt-2 w-100" id="tournament-name"></h2>
            <p class="text-center m-0 mb-3 w-100" id="tournament-status"></p>
            <div class="update-tournament-status-button d-flex justify-content-center fw-bold mb-3">
              <i class="bi bi-arrow-clockwise fs-5 me-1"></i>
              <p class="update-button-text m-0 pt-1"></p>
            </div>

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
            <a class="btn btn-wood" href="profile/${this.#state.username}" role="button">See my Profile</a>
          </div>
        </div>
      </div>  
    </div>
    `;
  }

  style() {
    return `
    <style>
    .update-tournament-status-button {
      color: var(--pm-text-green);
    }
    .update-tournament-status-button:hover {
      color: var(--pm-green-400);
    }
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
