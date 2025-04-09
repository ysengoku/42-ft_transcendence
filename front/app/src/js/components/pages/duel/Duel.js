import { router } from '@router';
import { auth } from '@auth';
// import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import './components/index.js';

import { mockDuelBeforeData } from '@mock/functions/mockDuelData.js';

export class Duel extends HTMLElement {
  #state = {
    loggedInUser: null,
    gameId: '',
    duelData: null,
    status: '', // wait_opponent, ready_to_start, playing, finished, canceled, wait_matchmaking
  };

  constructor() {
    super();

    this.cancelDuel = this.cancelDuel.bind(this);
    this.startDuel = this.startDuel.bind(this);
    // this.cancelMatchmaking = this.cancelMatchmaking.bind(this);
    this.navigateToHome = this.navigateToHome.bind(this);
    this.navigateToProfile = this.navigateToProfile.bind(this);
  }

  async setParam(param) {
    this.#state.gameId = param.gameId;

    await this.setLoggedInUser();
    await this.fetchDuelData();
    this.render();
  }

  disconnectedCallback() {
    this.cancelButton?.removeEventListener('click', this.cancelDuel);
    this.startButton?.removeEventListener('click', this.startDuel);
    this.goToHomeButton?.removeEventListener('click', this.navigateToHome);
    this.goToProfileButton?.removeEventListener('click', this.navigateToProfile);
  }

  async setLoggedInUser() {
    this.#state.loggedInUser = auth.getStoredUser();
    if (!this.#state.loggedInUser) {
      const response = await auth.fetchAuthStatus();
      if (response.success) {
        this.#state.loggedInUser = response.data;
      } else if (response.status === 401) {
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED);
        router.navigate('/login');
      }
    }
  }

  async fetchDuelData() {
    // For Test
    this.#state.duelData = await mockDuelBeforeData();

    this.#state.status = this.#state.duelData.status;
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.header = this.querySelector('#duel-header');
    this.content = this.querySelector('#duel-content');
    this.userActions = this.querySelector('#duel-user-actions');

    this.header.textContent = this.headerTemplate();
    if (this.#state.status === 'waiting' || this.#state.status === 'start' || this.#state.status === 'canceled') {
      const contentElement = document.createElement('duel-preview');
      contentElement.data = this.#state.duelData;
      this.content.appendChild(contentElement);
    } else if (this.#state.status === 'finished') {
      const contentElement = document.createElement('duel-summary-finished');
      contentElement.data = this.#state.duelData;
      this.content.appendChild(contentElement);
    }

    this.userActions.innerHTML = this.userActionsTemplate();
    this.cancelButton = this.querySelector('#cancel-duel-button');
    this.startButton = this.querySelector('#start-duel-button');
    this.goToHomeButton = this.querySelector('#go-to-home-button');
    this.goToProfileButton = this.querySelector('#go-to-profile-button');
    if (this.#state.status === 'waiting' || this.#state.status === 'start') {
      this.cancelButton?.classList.remove('d-none');
      this.cancelButton?.addEventListener('click', this.cacelDuel);
      if (this.#state.status === 'start') {
        this.startButton?.classList.remove('d-none');
        this.startButton?.addEventListener('click', this.startDuel);
      }
    } else if (this.#state.status === 'finished') {
      this.goToHomeButton?.classList.remove('d-none');
      this.goToHomeButton?.addEventListener('click', this.navigateToHome);
      this.goToProfileButton?.classList.remove('d-none');
      this.goToProfileButton?.addEventListener('click', this.navigateToProfile);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  cancelDuel() {}

  startDuel() {}

  // cancelMatchmaking() {
  // }

  navigateToHome() {
    router.navigate('/home');
  }

  navigateToProfile() {
    router.navigate(`/profile/${this.#state.loggedInUser.username}`);
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & Styles                                                   */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="row justify-content-center m-2">
      <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 d-flex flex-column justify-content-center align-items-center p-4">
        <p class="fs-4 my-2" id="duel-header"></p>
        <div id="duel-content"></div>
        <div class="my-2" id="duel-user-actions"></div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    `;
  }

  headerTemplate() {
    switch (this.#state.status) {
      case 'waiting':
        return 'Waiting for opponent to ride in...';
      case 'start':
        return 'Both gunslingers are here. Time to duel!';
      case 'playing':
        return '';
      case 'finished':
        return 'The duel is over. The winner is...';
      case 'canceled':
        return 'This duel has been canceled.';
    }
  }

  userActionsTemplate() {
    return `
    <div class="d-flex flex-row justify-content-center gap-4">
      <button class="btn d-none" id="cancel-duel-button">Cancel Duel</button>
      <button class="btn btn-wood d-none" id="start-duel-button">Ready to start</button>
      <button class="btn btn-wood d-none" id="go-to-home-button">Go to Home</button>
      <button class="btn btn-wood d-none" id="go-to-profile-button">See my profile</button>
    </div>
    `;
  }
}

customElements.define('duel-component', Duel);
