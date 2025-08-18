import { Modal } from 'bootstrap';
import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class UserGameResultModal extends HTMLElement {
  #state = {
    id: '',
    gameData: null,
  };

  constructor() {
    super();
    this.modal = null;
    this.modalElement = null;

    this.navigateToProfile = this.navigateToProfile.bind(this);
    this.clearFocusInModal = this.clearFocusInModal.bind(this);
  }

  async showModal(id) {
    this.#state.id = id;

    let response = null;
    /* eslint-disable-next-line new-cap */
    response = await apiRequest('GET', API_ENDPOINTS.MATCH_RESULT(this.#state.id), null, false, true);
    if (!response.success) {
      if (response.status === 404) {
        showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg, 3000);
      }
      return;
    }
    this.#state.gameData = response.data;
    this.render();

    if (this.modal) {
      this.modal.show();
    }
  }

  disconnectedCallback() {
    this.modal?.hide();

    this.modalElement?.removeEventListener('hide.bs.modal', this.clearFocusInModal);
    this.duelWinner?.removeEventListener('click', this.navigateToProfile);
    this.duelLoser?.removeEventListener('click', this.navigateToProfile);
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.modalElement = this.querySelector('.modal');
    this.gameResultContent = this.querySelector('#game-result-content');
    this.modalElement.addEventListener('hide.bs.modal', this.clearFocusInModal);
    this.renderDuelResult();
    this.modal = new Modal(this.modalElement);
  }

  renderDuelResult() {
    this.gameResultContent.innerHTML = this.resultTemplate();
    this.gameDate = this.querySelector('.game-date');
    this.duelWinner = this.querySelector('#duel-winner');
    this.duelLoser = this.querySelector('#duel-loser');

    const formatedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(this.#state.gameData.date));

    this.gameDate.innerHTML = formatedDate;

    this.duelWinner.innerHTML = this.userTemplate();
    this.duelWinner.setAttribute('username', this.#state.gameData.winner.username);
    this.duelWinner.querySelector('.duel-user-score').textContent = this.#state.gameData.winners_score;
    this.duelWinner.querySelector('.duel-user-avatar').src = this.#state.gameData.winner.avatar;
    this.duelWinner.querySelector('.duel-user-nickname').textContent = this.#state.gameData.winner.nickname;
    this.duelWinner.querySelector('.duel-user-username').textContent = `@${this.#state.gameData.winner.username}`;
    this.duelWinner.querySelector('.duel-user-elo').textContent = `Elo: ${this.#state.gameData.winner.elo}`;
    this.duelWinner.addEventListener('click', this.navigateToProfile);

    this.duelLoser.innerHTML = this.userTemplate();
    this.duelLoser.setAttribute('username', this.#state.gameData.loser.username);
    this.duelLoser.querySelector('.duel-user-score').textContent = this.#state.gameData.losers_score;
    this.duelLoser.querySelector('.duel-user-avatar').src = this.#state.gameData.loser.avatar;
    this.duelLoser.querySelector('.duel-user-nickname').textContent = this.#state.gameData.loser.nickname;
    this.duelLoser.querySelector('.duel-user-username').textContent = `@${this.#state.gameData.loser.username}`;
    this.duelLoser.querySelector('.duel-user-elo').textContent = `Elo: ${this.#state.gameData.loser.elo}`;
    this.duelLoser.addEventListener('click', this.navigateToProfile);
  }

  navigateToProfile(event) {
    const target = event.target;
    const userWrapper = target.closest('[username]');
    const username = userWrapper.getAttribute('username');
    this.modalElement.addEventListener(
      'hidden.bs.modal',
      () => {
        router.navigate(`/profile/${username}`);
      },
      { once: true },
    );
    this.modal.hide();
  }

  clearFocusInModal() {
    if (this.modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  template() {
    return `
    <div class="modal fade" id="game-result-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-4 text-center">
            <div class="modal-title">Duel Result</div>
            <div class="px-4 my-4 w-100" id="game-result-content"></div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .modal {
      top: 24px;
    }
    .modal-header {
      border-bottom: none;
    }
    .modal-title {
        font-family: 'van dyke', serif;
        font-size: 2rem;
    }
    </style>
    `;
  }

  resultTemplate() {
    return `
    <style>
    .game-date {
      color: rgba(var(--bs-body-color-rgb), 0.8);
    }
    .vs {
      font-size: 2rem;
      font-family: 'van dyke', serif;
      color: rgba(var(--bs-body-color-rgb), 0.6);
    }
    .duel-user-score {
      font-size: 4rem;
      font-weight: bold;
      width: 56px;
    }
    .badge {
      background-color: var(--pm-primary-600);
    }
    #duel-winner {
      .duel-user-score {
        color: var(--pm-green-400);
      }
    }
    #duel-loser {
      .duel-user-score {
        color: var(--pm-red-400);
      }
    }
    </style>
    <div class="d-flex flex-column justify-content-around align-items-center mb-5 gap-4">
      <div class="game-date"></div>
      <div class="w-100 px-4" id="duel-winner"></div>
      <div class="vs">vs</div>
      <div class="w-100 px-4" id="duel-loser"></div>
    </div>
    `;
  }

  userTemplate() {
    return `
      <div class="d-flex flex-row flex-wrap justify-content-start align-items-center gap-3">
        <div class="d-flex flex-row align-items-center me-3 gap-2">
          <div>Score:</div>
          <div class="duel-user-score"></div>
        </div>
        <img class="duel-user-avatar avatar-l rounded-circle" src="/img/default_avatar.png"/>
        <div class="d-flex flex-column flex-grow-1 justify-content-start align-items-start ps-2">
          <div class="duel-user-nickname text-break fs-4"></div>
          <div class="duel-user-username text-break"></div>
          <div class="duel-user-elo badge mt-2"></div>
        </div>
      </div>
      `;
  }
}

customElements.define('game-result-modal', UserGameResultModal);
