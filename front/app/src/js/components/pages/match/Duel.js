/**
 * @module Duel
 * @description This module displays the duel status and handles the duel flow before the game starts.
 */

import { router } from '@router';
import { auth } from '@auth';
import { socketManager } from '@socket';
import { showToastNotification, TOAST_TYPES } from '@utils';
import './components/index.js';

export const DUEL_STATUS = {
  INVITING: 'inviting',
  MATCHMAKING: 'matchmaking',
  STARTING: 'starting',
  INVITATION_CANCELED: 'invitationCanceled',
  INVITATION_DECLINED: 'declined',
  MATCHMAKING_CANCELED: 'matchmakingCanceled',
};

/**
 * @class Duel
 * @extends {HTMLElement}
 * @description Represents a duel page where users can the the status of pending or calceled duel.
 */
export class Duel extends HTMLElement {
  /**
   * @property {Object} #state - The internal state of the Duel component.
   * @property {string} #state.clientId - The unique identifier for the client instance.
   * @property {string} #state.status - The current status of the duel that indicates which content to render: inviting, matchmaking, starting, invitationCanceled, invitationDeclined, or matchmakingCanceled.
   * @property {string} #state.gameId - The ID of the game room.
   * @property {Object|null} #state.loggedInUser - The logged-in user information.
   * @property {Object|null} #state.opponent - The opponent's information.
   */
  #state = {
    clientId: '',
    status: '',
    gameId: '',
    loggedInUser: null,
    opponent: null,
  };

  // Countdown time in seconds before the duel starts
  #countdown = 3;

  constructor() {
    super();
    this.#state.clientId = socketManager.getClientInstanceId('livechat');
    this.handleGameFound = this.handleGameFound.bind(this);
    this.cancelMatchmaking = this.cancelMatchmaking.bind(this);
    this.handleMatchmakingCancellationByServer = this.handleMatchmakingCancellationByServer.bind(this);
    this.handleInvitationAccepted = this.handleInvitationAccepted.bind(this);
    this.invitationCanceled = this.invitationCanceled.bind(this);
    this.cancelInvitation = this.cancelInvitation.bind(this);
    this.confirmLeavePage = this.confirmLeavePage.bind(this);
  }

  /**
   * Called from the router to set the query parameters for the duel.
   * This method updates the internal state based on the provided URL parameters.
   * @param {Object} param
   * @return {void}
   */
  setQueryParam(param) {
    this.#state.status = param.get('status');
    switch (this.#state.status) {
      case DUEL_STATUS.MATCHMAKING:
        document.addEventListener('gameFound', this.handleGameFound);
        document.addEventListener('websocket-close', this.handleMatchmakingCancellationByServer);
        const queryParams = param.get('params') || null;
        socketManager.closeSocket('matchmaking');
        socketManager.openSocket('matchmaking', queryParams);
        devLog('Requesting matchmaking...');
        break;
      case DUEL_STATUS.STARTING:
        this.#state.gameId = param.get('gameId');
      case DUEL_STATUS.INVITING:
        this.#state.opponent = {
          username: param.get('username'),
          nickname: param.get('nickname'),
          avatar: param.get('avatar'),
        };
        break;
      default:
        this.#state.status = '';
        return;
    }
  }

  /**
   * Called when the status of the duel changes.
   * This method updates the internal state and re-renders the content.
   * @param {string} status - The new status of the duel.
   * @return {void}
   */
  set status(status) {
    this.#state.status = status;
    this.renderContent();
  }

  get status() {
    return this.#state.status;
  }

  get clientId() {
    return this.#state.clientId;
  }

  get opponent() {
    return this.#state.opponent;
  }

  async connectedCallback() {
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
    this.#state.loggedInUser = await auth.getUser();
    if (!this.#state.loggedInUser) {
      router.navigate('/login');
      return;
    }
    if (!this.#state.status) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    router.setBeforeunloadCallback(this.confirmLeavePage.bind(this));
    window.addEventListener('beforeunload', this.confirmLeavePage);

    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('gameFound', this.handleGameFound);
    document.removeEventListener('websocket-close', this.handleMatchmakingCancellationByServer);
    document.removeEventListener('duelInvitationAccepted', this.handleInvitationAccepted);
    document.removeEventListener('duelInvitationCanceled', this.invitationCanceled);
    router.removeBeforeunloadCallback();
    window.removeEventListener('beforeunload', this.confirmLeavePage);
    if (this.#state.status === DUEL_STATUS.MATCHMAKING) {
      this.cancelButton?.removeEventListener('click', this.cancelMatchmaking);
      socketManager.closeSocket(DUEL_STATUS.MATCHMAKING);
    } else if (this.#state.status === DUEL_STATUS.INVITING) {
      this.cancelButton?.removeEventListener('click', this.cancelInvitation);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = '';
    this.innerHTML = this.template();

    this.header = this.querySelector('#duel-header');
    this.content = this.querySelector('#duel-content');
    this.contentElement = document.createElement('duel-preview');
    this.cancelButton = this.querySelector('#cancel-duel-button');
    this.animation = this.querySelector('.pongAnimation');
    this.timer = this.querySelector('#timer');

    this.renderContent();
  }

  /**
   * Renders the content of the duel page based on the current state.
   * It updates the header, content element, and handles the animation and timer display.
   * It also sets up event listeners for canceling matchmaking or invitations.
   * @return {void}
   */
  renderContent() {
    this.content.innerHTML = '';
    this.header.textContent = this.headerTemplate();
    this.contentElement.setData(this.#state.status, this.#state.loggedInUser, this.#state.opponent);
    this.content.appendChild(this.contentElement);

    if (this.#state.status === DUEL_STATUS.MATCHMAKING || this.#state.status === DUEL_STATUS.INVITING) {
      this.animation.classList.remove('d-none');
    } else if (this.#state.status === DUEL_STATUS.STARTING) {
      this.animation.classList.add('d-none');
      this.timer.classList.remove('d-none');
      this.startDuel();
    } else {
      this.animation.classList.add('d-none');
      this.timer.classList.add('d-none');
      router.removeBeforeunloadCallback();
      window.removeEventListener('beforeunload', this.confirmLeavePage);
    }

    if (this.#state.status === DUEL_STATUS.INVITING) {
      this.cancelButton?.addEventListener('click', this.cancelInvitation);
    } else if (this.#state.status === DUEL_STATUS.MATCHMAKING) {
      this.cancelButton?.addEventListener('click', this.cancelMatchmaking);
    } else {
      this.cancelButton?.classList.add('d-none');
    }
    document.addEventListener('duelInvitationAccepted', this.handleInvitationAccepted);
    document.addEventListener('duelInvitationCanceled', this.invitationCanceled);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling for matchmaking                                      */
  /* ------------------------------------------------------------------------ */

  /**
   * Handles the event when a game is found during matchmaking.
   * It updates the internal state with the game ID and opponent's information,
   * and starts the duel process.
   * @param {CustomEvent} event - The event containing the game room details.
   * @return {void}
   */
  handleGameFound(event) {
    devLog('Game found:', event.detail);
    this.#state.gameId = event.detail.game_room_id;
    const { username, nickname, avatar, elo } = event.detail;
    this.#state.opponent = {
      username,
      nickname,
      avatar,
      elo,
    };
    this.startDuel();
  }

  /**
   * Called when the user clicks on cancel button during matchmaking.
   */
  cancelMatchmaking() {
    const message = { action: 'cancel' };
    socketManager.sendMessage('matchmaking', message);
    router.removeBeforeunloadCallback();
    window.removeEventListener('beforeunload', this.confirmLeavePage);
    socketManager.closeSocket('matchmaking');
    this.#state.status = DUEL_STATUS.MATCHMAKING_CANCELED;
    this.renderContent();
  }

  /**
   * Handle the event when matchmaking is canceled by the server.
   * @param {*} event
   * @return {void}
   *
   * Matchmaking ws close status codes:
   * 3000: Game found
   * 3001: Canceled by user
   * 3002: Unauthorized
   * 3003: Already engaged in another game activity
   * 3100: Invalid request
   */
  handleMatchmakingCancellationByServer(event) {
    if (
      event.detail.name !== 'matchmaking' ||
      this.#state.status !== DUEL_STATUS.MATCHMAKING ||
      !event.detail.code ||
      event.detail.code === 3000 ||
      event.detail.code === 3001
    ) {
      return;
    }
    if (event.detail.code === 3002 || event.detail.code === 3100) {
      router.removeBeforeunloadCallback();
      window.removeEventListener('beforeunload', this.confirmLeavePage);
      let message = '';
      switch (event.detail.code) {
        case 3002:
          message = 'You are not authorized to request matchmaking.';
          break;
        case 3003:
          message = 'You are already engaged to another game activity. Cannot request a new matchmaking.';
        case 3100:
        default:
          message = 'Matchmaking is momentarily unavailable.';
      }
      showToastNotification(message, TOAST_TYPES.ERROR);
      this.#state.status = DUEL_STATUS.MATCHMAKING_CANCELED;
      this.renderContent();
      devLog('Matchmaking canceled by server:', event.detail);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling for game invitation                                  */
  /* ------------------------------------------------------------------------ */

  /**
   * Handles the event when a duel invitation is accepted.
   * @param {Event|Object} input
   * @return {void}
   */
  handleInvitationAccepted(input) {
    let data;
    if (input instanceof CustomEvent) {
      data = input.detail;
    } else {
      data = input;
    }
    devLog('Invitation accepted:', data);
    if (this.#state.status === DUEL_STATUS.MATCHMAKING) {
      this.cancelMatchmaking();
      return;
    }
    this.#state.opponent = {
      username: data.username,
      nickname: data.nickname,
      avatar: data.avatar,
    };
    this.#state.status = DUEL_STATUS.STARTING;
    this.#state.gameId = data.game_id;
    this.startDuel();
  }

  invitationDeclined(data) {
    devLog('Invitation declined:', data);
    if (data.username !== this.#state.opponent.username) {
      return;
    }
    this.#state.status = DUEL_STATUS.INVITATION_DECLINED;
    this.renderContent();
  }

  async invitationCanceled(data) {
    devLog('Invitation canceled:', data.detail);
    if (!this.#state.status) {
      return;
    }
    if (data.detail.client_id && data.detail.client_id === this.#state.clientId && !data.detail.username) {
      const toastMessage = data.message || 'Game invitation has been canceled.';
      showToastNotification(TOAST_TYPES.ERROR, toastMessage);
    } else if (data.detail.username !== this.#state.loggedInUser.username) {
      return;
    }
    this.#state.status = DUEL_STATUS.INVITATION_CANCELED;
    this.renderContent();
  }

  cancelInvitation() {
    devLog('Canceling game invitation');
    const message = { action: 'cancel_game_invite', data: { username: this.#state.opponent.username } };
    socketManager.sendMessage('livechat', message);
    this.#state.status = DUEL_STATUS.INVITATION_CANCELED;
    this.renderContent();
  }

  /* ------------------------------------------------------------------------ */
  /*      Starting game                                                       */
  /* ------------------------------------------------------------------------ */
  startDuel() {
    this.#state.status = DUEL_STATUS.STARTING;
    this.animation.classList.add('d-none');
    this.cancelButton.classList.add('d-none');
    this.cancelButton?.removeEventListener('click', this.cancelMatchmaking);
    this.cancelButton?.removeEventListener('click', this.cancelInvitation);

    this.header.textContent = this.headerTemplate();
    this.contentElement.setData(this.#state.status, this.#state.loggedInUser, this.#state.opponent);
    this.timer.classList.remove('d-none');
    let timeLeft = this.#countdown;
    this.timer.textContent = `Starting in ${timeLeft} seconds...`;
    const countdown = setInterval(() => {
      timeLeft -= 1;
      this.timer.textContent = `Starting in ${timeLeft} seconds...`;
      if (timeLeft <= 0) {
        clearInterval(countdown);
        router.removeBeforeunloadCallback();
        window.removeEventListener('beforeunload', this.confirmLeavePage);
        socketManager.closeSocket('matchmaking');
        router.navigate(`/multiplayer-game/${this.#state.gameId}`);
      }
    }, 1000);
  }

  /* ------------------------------------------------------------------------ */
  /*      Prevent page changes and reload                                     */
  /* ------------------------------------------------------------------------ */
  async confirmLeavePage(event) {
    if (event) {
      event.preventDefault();
      event.returnValue = '';
      router.removeBeforeunloadCallback();
      return;
    }

    const confirmationMessage = 'If you leave this page, the duel will be canceled.\nDo you want to continue?';
    const confirmationModal = document.createElement('confirmation-modal');
    this.appendChild(confirmationModal);
    confirmationModal.render();
    confirmationModal.querySelector('.confirmation-message').textContent = confirmationMessage;
    confirmationModal.querySelector('.confirm-button').textContent = 'Leave this page';
    confirmationModal.querySelector('.cancel-button').textContent = 'Stay';
    confirmationModal.showModal();

    const userConfirmed = await new Promise((resolve) => {
      confirmationModal.handleConfirm = () => {
        devLog('User confirmed to leave the page');
        let message = '';
        let wsName = '';
        if (this.#state.status === DUEL_STATUS.MATCHMAKING) {
          message = { action: 'cancel' };
          wsName = 'matchmaking';
          devLog('Canceling matchmaking', message);
        } else if (this.#state.status === DUEL_STATUS.INVITING) {
          message = { action: 'cancel_game_invite', data: { username: this.#state.opponent.username } };
          wsName = 'livechat';
          devLog('Canceling game invitation', message);
        }
        socketManager.sendMessage(wsName, message);
        confirmationModal.remove();
        resolve(true);
      };
      confirmationModal.handleCancel = () => {
        devLog('User canceled leaving the page');
        confirmationModal.remove();
        resolve(false);
      };
    });

    if (userConfirmed) {
      return true;
    } else {
      return false;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & Styles                                                   */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="row justify-content-center m-2">
      <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 d-flex flex-column justify-content-center align-items-center p-4">
        <p class="fs-4 fw-bold my-2" id="duel-header"></p>
        <div class="pongAnimation d-none"></div>
        <div class="" id="timer"></div>
        <div id="duel-content"></div>
        <button class="btn my-2" id="cancel-duel-button">Cancel Duel</button>
      </div>
    </div>
    `;
  }

  headerTemplate() {
    switch (this.#state.status) {
      case DUEL_STATUS.INVITING:
        return 'Waiting for your opponent to ride in...';
      case DUEL_STATUS.MATCHMAKING:
        return 'Searching for your dream opponent...';
      case DUEL_STATUS.STARTING:
        return 'Both gunslingers are here. Time to duel!';
      default:
        return 'This duel has been canceled.';
    }
  }
}

customElements.define('duel-page', Duel);
