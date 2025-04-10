import { router } from '../../../../router';
import anonymousavatar from '/img/anonymous-avatar.png?url';

export class DuelPreview extends HTMLElement {
  #state = {
    status: '',
    loggedInUser: null,
    opponent: null,
  };

  constructor() {
    super();
  }

  setData(duelStatus, loggedInUser, opponent) {
    if (!duelStatus || !loggedInUser) {
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
    this.#state.loggedInUser = loggedInUser;
    if (opponent) {
      this.#state.opponent = opponent;
    }
    this.render();
  }

  render() {
    console.log('Status', this.#state.status);
    this.innerHTML = this.template() + this.style();

    this.player1 = this.querySelector('#duel-player1');
    this.player2 = this.querySelector('#duel-player2');

    this.player1.innerHTML = this.userProfileTemplate();
    this.player1.querySelector('.player-avatar').src = this.#state.loggedInUser.avatar;
    this.player1.querySelector('.player-nickname').innerHTML = this.#state.loggedInUser.nickname;
    this.player1.querySelector('.player-username').innerHTML = `@${this.#state.loggedInUser.username}`;
    this.player1.querySelector('.player-elo').innerHTML = `Elo: ${this.#state.loggedInUser.elo}`;

    this.player2.innerHTML = this.userProfileTemplate(),
    this.#state.status === 'matchmaking' ? (
      this.player2.querySelector('.player-avatar').src = anonymousavatar
      ) : (
      this.player2.querySelector('.player-avatar').src = this.#state.opponent.avatar,
      this.player2.querySelector('.player-nickname').innerHTML = this.#state.opponent.nickname,
      this.player2.querySelector('.player-username').innerHTML = this.#state.opponent.username,
      this.player2.querySelector('.player-elo').innerHTML = `Elo: ${this.#state.opponent.elo}`
    );
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
      <span class="player-elo badge mt-3 p-2"></span> 
    </div>`;
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
