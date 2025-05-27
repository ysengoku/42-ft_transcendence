import { router } from '@router';
import anonymousavatar from '/img/anonymous-avatar.png?url';

export class DuelPreview extends HTMLElement {
  #state = {
    status: '',
    user1: null,
    user2: null,
  };

  constructor() {
    super();

    this.player1 = null;
    this.player2 = null;
    this.goToHomeButton = null;
    this.goToDuelMenuButton = null;

    this.navigateToHome = this.navigateToHome.bind(this);
    this.navigateToDuelMenu = this.navigateToDuelMenu.bind(this);
  }

  setData(duelStatus, user1, user2) {
    if (!duelStatus || !user1) {
      const notFound = document.createElement('page-not-found');
      const duelPage = document.querySelector('duel-page');
      if (duelPage) {
        duelPage.innerHTML = '';
        duelPage.appendChild(notFound);
      } else {
        router.navigate('error');
      }
      return;
    }
    this.#state.status = duelStatus;
    this.#state.user1 = user1;
    if (user2) {
      this.#state.user2 = user2;
    }
    this.render();
  }

  disconnectedCallback() {
    this.goToHomeButton?.removeEventListener('click', this.navigateToHome);
    this.goToDuelMenuButton?.removeEventListener('click', this.navigateToDuelMenu);
  }

  render() {
    if (this.#state.status === 'canceled' || this.#state.status === 'declined') {
      this.innerHTML = this.canceledTemplate();

      const cancelMessage = this.querySelector('#cancel-message');
      cancelMessage.textContent = this.#state.status === 'canceled' ?
        'Your invitation has been canceled.' :
        `${this.#state.user2.nickname} declined the duel.`;

      this.goToHomeButton = this.querySelector('#btn-go-to-home');
      this.goToDuelMenuButton = this.querySelector('#btn-go-to-duelmenu');
      this.goToHomeButton.addEventListener('click', this.navigateToHome);
      this.goToDuelMenuButton.addEventListener('click', this.navigateToDuelMenu);
      return;
    }
    this.innerHTML = this.template() + this.style();
    this.player1 = this.querySelector('#duel-player1');
    this.player2 = this.querySelector('#duel-player2');

    this.player1.innerHTML = this.userProfileTemplate();
    this.player1.querySelector('.player-avatar').src = this.#state.user1.avatar;
    this.player1.querySelector('.player-nickname').innerHTML = this.#state.user1.nickname;
    this.player1.querySelector('.player-username').innerHTML = `@${this.#state.user1.username}`;

    this.player2.innerHTML = this.userProfileTemplate(),
    this.#state.status === 'matchmaking' ? (
      this.player2.querySelector('.player-avatar').src = anonymousavatar
    ) : (
      this.player2.querySelector('.player-avatar').src = this.#state.user2.avatar,
      this.player2.querySelector('.player-nickname').innerHTML = this.#state.user2.nickname,
      this.player2.querySelector('.player-username').innerHTML = `@${this.#state.user2.username}`
    );
  }

  navigateToHome() {
    router.navigate('/home');
  }

  navigateToDuelMenu() {
    router.navigate('/duel');
  }

  template() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center gap-3">
      <div id="duel-player1"></div>
      <p class="fs-1 fw-bolder">VS</p>
      <div id="duel-player2"></div>
    </div>
  `;
  }

  userProfileTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center my-4 p-4" id="duel-player1">
      <img class="player-avatar avatar-xl img-fluid rounded-circle" alt="palyer">
      <p class="player-nickname m-0 mt-1 fs-4 fw-bold"></p>
      <p class="player-username m-0"></p>
    </div>`;
  }

  canceledTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center gap-3">
      <div class="mt-2" id="cancel-message"></div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 gap-3">
        <button class="btn fw-bold" id="btn-go-to-home">Go back to Saloon</button>
        <button class="btn fw-bold" id="btn-go-to-duelmenu">Find another duel</button>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .badge {
      background-color: var(--pm-primary-600);
    }
    </style>
  `;
  }
}

customElements.define('duel-preview', DuelPreview);
