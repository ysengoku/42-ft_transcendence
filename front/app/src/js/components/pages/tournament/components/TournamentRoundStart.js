import { router } from '@router';

export class TournamentRoundStart extends HTMLElement {
  #state = {
    nextRoundNumber: 1,
    nextRound: null,
    gameId: '',
    userAlias: 'You',
    opponentAlias: 'Opponent',
    isFirstRound: true,
  };

  #countdown = 2;

  constructor() {
    super();

    this.roundNumberElement = null;
    this.timer = null;
    this.roundContentWrapper = null;
  }

  set data(data) {
    this.#state.nextRoundNumber = data.round_number;
    this.#state.nextRound = data.round;
    this.#state.gameId = data.game_id;
    this.#state.userAlias = data.userAlias || 'You';
    this.#state.opponentAlias = data.opponentAlias || 'Opponent';
    this.#state.isFirstRound = this.#state.nextRoundNumber === 1;
  }

  connectedCallback() {
    this.render();
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  async render() {
    this.innerHTML = this.style() + this.template();
    this.roundNumberElement = this.querySelector('#round-number');
    this.roundStatusMessage = this.querySelector('#round-status-message');
    this.timer = this.querySelector('#round-start-timer');
    this.bracketsWrapper = this.querySelector('#brackets-wrapper');
    if (this.#state.isFirstRound) {
      this.roundStatusMessage.innerHTML = `
      <div class="d-flex flex-column justify-content-center fs-5 my-5 py-5">
        All Gunslingers are now in the Arena.</br>Tournament starts!
      </div>
      `;
      setTimeout(() => this.renderNextRound(), 700);
      return;
    }

    this.renderNextRound();
  }

  renderNextRound() {
    this.bracketsWrapper.innerHTML = '';
    this.roundStatusMessage.textContent = '';
    this.roundNumberElement.classList.add('fade-in-animation');
    this.roundNumberElement.textContent = `Round ${this.#state.nextRoundNumber}`;
    this.timer.classList.add('fade-in-animation');
    this.timer.textContent = 'Next round';
    for (let i = 0; i < this.#state.nextRound.brackets.length; i++) {
      const bracketElement = document.createElement('bracket-element');
      bracketElement.classList.add('fade-in-animation');
      bracketElement.data = this.#state.nextRound.brackets[i];
      this.bracketsWrapper.appendChild(bracketElement);
    }
    this.countDownTimer();
  }

  countDownTimer() {
    let timeLeft = this.#countdown;
    const queryParams = new URLSearchParams({
      userPlayerName: this.#state.userAlias,
      opponentPlayerName: this.#state.opponentAlias,
    }).toString();
    const countdown = setInterval(() => {
      this.timer.textContent = `Starting in ${timeLeft} seconds...`;
      timeLeft -= 1;
      if (timeLeft < 0) {
        clearInterval(countdown);
        router.redirect(`multiplayer-game/${this.#state.gameId}?${queryParams}`);
      }
    }, 1000);
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <h3 class="text-center m-1" id="round-number"></h3>
      <p class="text-center mb-4" id="round-status-message"></p>
      <div class="text-center fs-5 mb-4" id="round-start-timer"></div>
      <div class="d-flex flex-row flex-wrap justify-content-center mb-3 px-4 gap-4" id="brackets-wrapper"></div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .bracket-player {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: .4rem;
      margin-bottom: .2rem;
    }

    </style>
    `;
  }

  participantTemplate() {
    return `
    <div class="bracket-player d-flex flex-row justify-content-center align-items-center mx-2 px-3 py-2 gap-2">
      <img class="participant-avatar avatar-xxs rounded-circle" alt="Participant avatar" />
      <p class="participant-alias m-0 fs-6"></div>
    </div>
    `;
  }
}

customElements.define('tournament-round-start', TournamentRoundStart);
