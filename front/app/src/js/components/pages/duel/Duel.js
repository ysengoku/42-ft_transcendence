import { router } from '@router';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import './components/index.js';

// Status === matchmaking
// Establishes websocket connection to /ws/matchmaking
// listen WebSocket message (action 'game_found' with 'game_room_id')
// Show starting view
// After 5 seconds, redirect to Game

// Status === inviting
// listen WebSocket message (action ? with 'game_room_id')
// Show starting view
// After 5 seconds, redirect to Game

export class Duel extends HTMLElement {
  #status = ''; // inviting, matchmaking, starting, canceled(?)

  #state = {
    loggedInUser: null,
    opponent: null,
    gameId: '',
  };

  constructor() {
    super();

    this.url = 'wss://' + window.location.host + '/ws/matchmaking/';
    this.socket = null;
    this.cancelDuel = this.cancelDuel.bind(this);
  }

  setQueryParam(param) {
    console.log('Query param:', param);
    this.#status = param.get('status');
    if (this.#status === 'inviting') {
      this.#state.opponent = {
        username: param.get('username'),
        nickname: param.get('nickname'),
        avatar: param.get('avatar'),
        elo: param.get('elo'),
      };
      console.log('Opponent:', this.#state.opponent);
    } else if (this.#status === 'starting') {
      // TODO: set necessary information
    }
  }

  async connectedCallback() {
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

    // TODO: How to handle browser refresh case?
    if (!this.#status) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = '';
      this.appendChild(notFound);
      return;
    }

    this.render();
    if (this.#status === 'matchmaking') {
      this.requestMatchmaking();
    } else if (this.#status === 'inviting') {
      // TODO: Add listener for response to duel invitation
    }
  }

  disconnectedCallback() {
    this.cancelButton?.removeEventListener('click', this.cancelDuel);
    this.socket?.close();
    this.socket = null;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  render() {
    this.innerHTML = this.template() + this.style();
    console.log('Status:', this.#status);
    this.header = this.querySelector('#duel-header');
    this.content = this.querySelector('#duel-content');
    this.contentElement = document.createElement('duel-preview');
    this.cancelButton = this.querySelector('#cancel-duel-button');
    this.animation = this.querySelector('.pongAnimation');
    this.timer = this.querySelector('#timer');

    this.header.textContent = this.headerTemplate();
    this.contentElement.setData(this.#status, this.#state.loggedInUser, this.#state.opponent);
    this.content.appendChild(this.contentElement);

    if (this.#status === 'matchmaking' || this.#status === 'inviting') {
      this.animation.classList.remove('d-none');
      // ==== For test ================
      // if (this.#status === 'inviting') {
      //   setTimeout(() => {
      //     this.startDuel();
      //   }, 5000);
      // }
      // ================================
    } else if (this.#status === 'starting') {
      this.animation.classList.add('d-none');
      this.timer.classList.remove('d-none');
      this.startDuel();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  requestMatchmaking() {
    devLog('Requesting matchmaking...');
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      devLog('WebSocket connection opened to ', this.url);
    };
    this.socket.onmessage = (event) => {
      devLog('WebSocket message received:', event.data);
      const message = JSON.parse(event.data);
      if (message.action === 'game_found') {
        this.#state.gameId = message.data.game_room_id;
        // TODO: Set opponent data
        this.startDuel();
      }
    };
    this.socket.onerror = (event) => {
      devErrorLog('WebSocket error:', event);
    };
    this.socket.onclose = (event) => {
      devLog('WebSocket connection closed:', event);
      this.socket = null;
    };

    // ===== For test ================
    // this.#state.opponent = {
    //   username: 'Alice',
    //   nickname: 'Alice',
    //   avatar: '/__mock__/img/sample-pic2.png',
    //   elo: 1500,
    // };
    // setTimeout(() => {
    //   this.startDuel();
    // }, 5000);
    // ================================
  }

  cancelDuel() {
    // TODO: Send cancel duel message to server
  }

  startDuel() {
    this.#status = 'starting';
    this.animation.classList.add('d-none');

    this.header.textContent = this.headerTemplate();
    this.contentElement.setData(this.#status, this.#state.loggedInUser, this.#state.opponent);
    this.timer.classList.remove('d-none');
    let timeLeft = 5;
    this.timer.textContent = `Starting in ${timeLeft} seconds...`;
    const countdown = setInterval(() => {
      timeLeft -= 1;
      this.timer.textContent = `Starting in ${timeLeft} seconds...`;
      if (timeLeft <= 0) {
        clearInterval(countdown);

        // ===== For test ================
        this.#state.gameId = '1234567890';
        // ================================

        router.navigate(`/multiplayer-game/${this.#state.gameId}`);
      }
    }, 1000);
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
    switch (this.#status) {
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
