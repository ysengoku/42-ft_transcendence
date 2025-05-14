export class TournamentRoundStart extends HTMLElement {
  #state = {
    roundNumber: 1,
    round: null,
  }

  #countdown = 5;

  constructor() {
    super();

    this.roundNumber = null;
    this.timer = null;
    this.roundContentWrapper = null;
  }

  set data(data) {
    this.#state.roundNumber = data.round_number;
    this.#state.round = data.round;
    this.isFirstRound = this.#state.roundNumber === 1;
    this.render();
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    if (this.isFirstRound) {
      this.innerHTML = `
      <div class="d-flex flex-column justify-content-center my-5 py-5">
          All Gunslingers are now in the Arena. Tournament starts very soon.
      </div>
      `;
      this.isFirstRound = false;
      setTimeout(() => this.render(), 3000);
      return;
    }
    this.innerHTML = this.template() + this.style();
    this.roundNumber = this.querySelector('#round-number');
    this.bracketsWrapper = this.querySelector('#brackets-wrapper');

    this.roundNumber.textContent = `Round ${this.#state.roundNumber}`;
    this.renderBrackets();
    this.countDownTimer();
  }

  renderBrackets() {
    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      const bracket = document.createElement('div');
      bracket.classList.add('d-flex', 'flex-column', 'mx-2', 'mb-3');

      const player1 = document.createElement('div');
      player1.innerHTML = this.participantTemplate();
      const player1AvatarElement = player1.querySelector('img');
      player1AvatarElement.src = this.#state.round.brackets[i].participant1.user.avatar;
      const player1AliasElement = player1.querySelector('.participant-alias');
      player1AliasElement.textContent = this.#state.round.brackets[i].participant1.alias;

      const player2 = document.createElement('div');
      player2.innerHTML = this.participantTemplate();
      const player2AvatarElement = player2.querySelector('img');
      player2AvatarElement.src = this.#state.round.brackets[i].participant2.user.avatar;
      const player2AliasElement = player2.querySelector('.participant-alias');
      player2AliasElement.textContent = this.#state.round.brackets[i].participant2.alias;

      bracket.appendChild(player1);
      bracket.appendChild(player2);
      this.bracketsWrapper.appendChild(bracket);
    }
  }

  countDownTimer() {
    let timeLeft = this.#countdown;
    const countdown = setInterval(() => {
      timeLeft -= 1;
      this.timer.textContent = `Starting in ${timeLeft} seconds...`;
      if (timeLeft <= 0) {
        clearInterval(countdown);
        // navigate to match
      }
    }, 1000);
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <h3 class="text-center m-1" id="round-number">Round 1</h3>
      <div class="mb-4" id="round-start-timer">
        <p class="text-center m-1">Starts in</p>
      </div>
      <div class="d-flex flex-row flex-wrap justify-content-center mb-3 px-4" id="brackets-wrapper"></div>
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
