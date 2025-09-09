/**
 * @module DuelPreview
 * @description Component to display a duel preview, showing the players involved and their statuses (inviting, matchmaking, canceled)
 */

import { router } from '@router';
import { DUEL_STATUS } from '../Duel';
import anonymousavatar from '/img/anonymous-avatar.png?url';

export class DuelPreview extends HTMLElement {
  /**
   * @property {Object} #state - Internal state of the component
   * @property {string} #state.status - Status of the duel (INVITING, MATCHMAKING, INVITATION_CANCELED, INVITATION_DECLINED, MATCHMAKING_CANCELED)
   * @property {Object} #state.user1 - Data of the logged user in the duel
   * @property {Object} #state.user2 - Data of the opponent user in the duel (if available)
   */
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

  /**
   * Called from the parent component (Duel) to set the duel data and render the content.
   */
  setData(duelStatus, user1, user2) {
    if (!duelStatus || !user1) {
      const notFound = document.createElement('page-not-found');
      const duelPage = document.querySelector('duel-page');
      if (duelPage) {
        duelPage.innerHTML = '';
        duelPage.appendChild(notFound);
      } else {
        router.redirect('/error');
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

  /**
   * Renders the component based on the current state.
   * If the duel status indicates a canceled invitation or matchmaking, it displays a cancellation message with buttons to navigate back to the home or duel menu.
   * Otherwise, it displays the duel preview with player profiles and waiting animation.
   */
  render() {
    if (
      this.#state.status === DUEL_STATUS.INVITATION_CANCELED ||
      this.#state.status === DUEL_STATUS.INVITATION_DECLINED ||
      this.#state.status === DUEL_STATUS.MATCHMAKING_CANCELED
    ) {
      this.innerHTML = this.canceledTemplate();

      const cancelMessage = this.querySelector('#cancel-message');
      if (this.#state.status === DUEL_STATUS.INVITATION_CANCELED) {
        cancelMessage.textContent = 'Your invitation has been canceled.';
      } else if (this.#state.status === DUEL_STATUS.INVITATION_DECLINED) {
        cancelMessage.textContent = `${this.#state.user2.nickname} declined the duel.`;
      } else if (this.#state.status === DUEL_STATUS.MATCHMAKING_CANCELED) {
        cancelMessage.textContent = 'Your matchmaking request has been canceled.';
      }

      this.goToHomeButton = this.querySelector('#btn-go-to-home');
      this.goToDuelMenuButton = this.querySelector('#btn-go-to-duelmenu');
      this.goToHomeButton.addEventListener('click', this.navigateToHome);
      this.goToDuelMenuButton.addEventListener('click', this.navigateToDuelMenu);
      return;
    }
    this.innerHTML = this.style() + this.template();
    this.player1 = this.querySelector('#duel-player1');
    this.player2 = this.querySelector('#duel-player2');

    // Render logged in player profiles based on the duel status
    this.player1.innerHTML = this.userProfileTemplate();
    this.player1.querySelector('.player-avatar').src = this.#state.user1.avatar;
    this.player1.querySelector('.player-nickname').innerHTML = this.#state.user1.nickname;
    this.player1.querySelector('.player-username').innerHTML = `@${this.#state.user1.username}`;

    // Render opponent player profiles if inviting, or anonymous avatar if matchmaking
    (this.player2.innerHTML = this.userProfileTemplate()),
      this.#state.status === DUEL_STATUS.MATCHMAKING
        ? (this.player2.querySelector('.player-avatar').src = anonymousavatar)
        : ((this.player2.querySelector('.player-avatar').src = this.#state.user2.avatar),
          (this.player2.querySelector('.player-nickname').innerHTML = this.#state.user2.nickname),
          (this.player2.querySelector('.player-username').innerHTML = `@${this.#state.user2.username}`));
  }

  navigateToHome() {
    router.redirect('/home');
  }

  navigateToDuelMenu() {
    router.redirect('/duel-menu');
  }

  template() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center gap-3">
      <div id="duel-player1" class="duel-player-profile"></div>
      <p class="fs-1 fw-bolder">VS</p>
      <div id="duel-player2" class="duel-player-profile"></div>
    </div>
  `;
  }

  style() {
    return `
    <style>
    .duel-player-profile {
      max-width: 40%;
    }
    </style>`;
  }

  userProfileTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center my-4 p-4" id="duel-player1">
      <img class="player-avatar avatar-xl img-fluid rounded-circle" alt="palyer">
      <p class="player-nickname m-0 mt-1 fs-4 fw-bold text-break"></p>
      <p class="player-username m-0 text-break"></p>
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
}

customElements.define('duel-preview', DuelPreview);
