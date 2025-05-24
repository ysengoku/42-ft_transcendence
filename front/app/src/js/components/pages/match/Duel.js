import { router } from '@router';
import { auth } from '@auth';
import { socketManager } from '@socket';
import './components/index.js';

export class Duel extends HTMLElement {
  #state = {
    status: '', // inviting, matchmaking, starting, canceled, declied
    gameId: '',
    loggedInUser: null,
    opponent: null,
  };

  #countdown = 3;

  constructor() {
    super();

    this.handleGameFound = this.handleGameFound.bind(this);
    this.cancelMatchmaking = this.cancelMatchmaking.bind(this);
    this.cancelInvitation = this.cancelInvitation.bind(this);
    this.confirmLeavePage = this.confirmLeavePage.bind(this);
  }

  setQueryParam(param) {
    this.#state.status = param.get('status');
    if (this.#state.status !== 'inviting' && this.#state.status !== 'matchmaking') {
      this.#state.status = '';
      return;
    }
    if (this.#state.status === 'inviting') {
      this.#state.opponent = {
        username: param.get('username'),
        nickname: param.get('nickname'),
        avatar: param.get('avatar'),
      };
    }
  }

  async connectedCallback() {
    this.#state.loggedInUser = await auth.getUser();
    if (!this.#state.loggedInUser) {
      router.navigate('/login');
      return;
    }
    if (!this.#state.status) {
      // Redirect to duel menu
      router.navigate('/duel-menu');
      return;
    }
    router.setBeforeunloadCallback(this.confirmLeavePage.bind(this));
    window.addEventListener('beforeunload', this.confirmLeavePage);

    this.render();
    if (this.#state.status === 'matchmaking') {
      this.requestMatchmaking();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('gameFound', this.handleGameFound);
    router.removeBeforeunloadCallback();
    window.removeEventListener('beforeunload', this.confirmLeavePage);
    if (this.#state.status === 'matchmaking') {
      this.cancelButton?.removeEventListener('click', this.cancelMatchmaking);
      socketManager.closeSocket('matchmaking');
    } else if (this.#state.status === 'inviting') {
      this.cancelButton?.removeEventListener('click', this.cancelInvitation);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();
    devLog('Status:', this.#state.status);
    this.header = this.querySelector('#duel-header');
    this.content = this.querySelector('#duel-content');
    this.contentElement = document.createElement('duel-preview');
    this.cancelButton = this.querySelector('#cancel-duel-button');
    this.animation = this.querySelector('.pongAnimation');
    this.timer = this.querySelector('#timer');

    this.header.textContent = this.headerTemplate();
    this.contentElement.setData(this.#state.status, this.#state.loggedInUser, this.#state.opponent);
    this.content.appendChild(this.contentElement);

    if (this.#state.status === 'matchmaking' || this.#state.status === 'inviting') {
      this.animation.classList.remove('d-none');
      // ==== For test ================
      // setTimeout(() => {
      //   const data = {
      //     gameId: 'test-game-id',
      //   };
      //   this.invitationAccepted(data);
      // }, 5000);
      // ================================
    } else if (this.#state.status === 'starting') {
      this.animation.classList.add('d-none');
      this.timer.classList.remove('d-none');
      this.startDuel();
    }
    if (this.#state.status === 'inviting') {
      this.cancelButton?.addEventListener('click', this.cancelInvitation);
    } else if (this.#state.status === 'matchmaking') {
      this.cancelButton?.addEventListener('click', this.cancelMatchmaking);
    } else {
      this.cancelButton?.classList.add('d-none');
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  requestMatchmaking() {
    devLog('Requesting matchmaking...');
    socketManager.openSocket('matchmaking');
    document.addEventListener('gameFound', this.handleGameFound);
  }

  handleGameFound(event) {
    devLog('Game found event:', event.detail);
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

  cancelMatchmaking() {
    devLog('Canceling matchmaking');
    const message = { action: 'cancel' };
    socketManager.sendMessage('matchmaking', message);
    router.removeBeforeunloadCallback();
    router.navigate('/duel-menu');
  }

  invitationAccepted(data) {
    this.#state.status = 'starting';
    this.#state.gameId = data.gameId;
    this.render();
  }

  invitationDeclined(data) {
    if (data.username !== this.#state.opponent.username) {
      return;
    }
    router.removeBeforeunloadCallback();
    window.removeEventListener('beforeunload', this.confirmLeavePage);
    this.#state.status = 'decliend';
    this.render();
  }

  cancelInvitation() {
    devLog('Canceling invitation');
    const message = { action: 'cancel_game_invite', data: { username: this.#state.opponent.username } };
    socketManager.sendMessage('livechat', message);
    router.removeBeforeunloadCallback();
    window.removeEventListener('beforeunload', this.confirmLeavePage);
    this.#state.status = 'canceled';
    this.render();
  }

  startDuel() {
    this.#state.status = 'starting';
    this.animation.classList.add('d-none');

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

  async confirmLeavePage(event) {
    const message = 'If you leave this page, the duel will be canceled.\nDo you want to continue?';
    if (event) {
      event.preventDefault();
      router.removeBeforeunloadCallback();
      return;
    }

    const confirmationModal = document.createElement('confirmation-modal');
    this.appendChild(confirmationModal);
    confirmationModal.render();
    confirmationModal.querySelector('.confirmation-message').textContent = message;
    confirmationModal.querySelector('.confirm-button').textContent = 'Leave this page';
    confirmationModal.querySelector('.cancel-button').textContent = 'Stay';
    confirmationModal.showModal();

    const userConfirmed = await new Promise((resolve) => {
      confirmationModal.handleConfirm = () => {
        devLog('User confirmed to leave the page');
        const message = { action: 'cancel' };
        devLog('Canceling matchmaking', message);
        socketManager.sendMessage('matchmaking', message);
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
        <p class="fs-4 my-2" id="duel-header"></p>
        <div class="pongAnimation d-none"></div>
        <div class="" id="timer"></div>
        <div id="duel-content"></div>
        <button class="btn my-2" id="cancel-duel-button">Cancel Duel</button>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .pongAnimation {
      width: 64%;
      height: 64px;
      padding: 0 8px;
      box-sizing: border-box;
      background:
      linear-gradient(var(--pm-primary-500) 0 0) 0    0/8px 20px,
      linear-gradient(var(--pm-primary-500) 0 0) 100% 0/8px 20px,
      radial-gradient(farthest-side,var(--pm-primary-400) 90%,#0000) 0 8px/12px 12px content-box,
      transparent;
      background-repeat: no-repeat; 
      animation: pong 6s infinite linear;
    }
    @keyframes pong{
      25% {background-position: 0 0,100% 100%,100% calc(100% - 4px)}
      50% {background-position: 0 100%,100% 100%,0 calc(100% - 4px)}
      75% {background-position: 0 100%,100% 0,100% 4px}
    }
    </style>
    `;
  }

  headerTemplate() {
    switch (this.#state.status) {
      case 'inviting':
        return 'Waiting for your opponent to ride in...';
      case 'matchmaking':
        return 'Searching for your dream opponent...';
      case 'starting':
        return 'Both gunslingers are here. Time to duel!';
      case 'canceled':
        return 'This duel has been canceled.';
    }
  }
}

customElements.define('duel-page', Duel);
