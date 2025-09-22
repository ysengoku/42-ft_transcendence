import { router } from '@router';

export class TournamentBracketOngoing extends HTMLElement {
  #state = {
    roundNumber: 1,
    round: null,
    gameId: '',
    userAlias: 'You',
    opponentAlias: 'Opponent',
  };

  constructor() {
    super();

    this.roundNumberElement = null;
    this.timer = null;
    this.roundContentWrapper = null;
  }

  set data(data) {
    this.#state.roundNumber = data.round_number;
    this.#state.round = data.round;
    this.#state.gameId = data.game_id;
    this.#state.userAlias = data.userAlias || 'You';
    this.#state.opponentAlias = data.opponentAlias || 'Opponent';
  }

  connectedCallback() {
    this.render();
    requestAnimationFrame(() => {
      setTimeout(() => {
        router.redirect(`multiplayer-game/${this.#state.gameId}`);
      }, 1500);
    });
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  async render() {
    this.innerHTML = this.style() + this.template();
    this.roundNumberElement = this.querySelector('#round-number');
    this.message = this.querySelector('#redirecting-message');
    this.bracketsWrapper = this.querySelector('#brackets-wrapper');
    this.renderBrackets();
  }

  renderBrackets() {
    this.bracketsWrapper.innerHTML = '';
    this.roundNumberElement.textContent = `Round ${this.#state.roundNumber}`;
    this.message.textContent = 'Redirecting to Game room...';
    this.roundNumberElement.classList.add('fade-in-animation');
    this.message.classList.add('fade-in-animation');
    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      const bracketElement = document.createElement('bracket-element');
      bracketElement.classList.add('fade-in-animation');
      bracketElement.data = this.#state.round.brackets[i];
      this.bracketsWrapper.appendChild(bracketElement);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <h3 class="text-center m-1" id="round-number"></h3>
      <div class="text-center fs-5 mb-4" id="redirecting-message"></div>
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

customElements.define('tournament-bracket-ongoing', TournamentBracketOngoing);
