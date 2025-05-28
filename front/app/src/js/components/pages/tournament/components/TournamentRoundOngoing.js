import { flyAway } from '@utils'

export class TournamentRoundOngoing extends HTMLElement {
  #state = {
    roundNumber: 1,
    round: null,
    status: '',
  };

  #messages = {
    waitingNextRound: 'Waiting for all Gunslingers to complete their matches.',
    roundFinished: 'All Gunslingers have completed their matches. Preparing the next round.',
  };

  constructor() {
    super();
    this.roundNumberElement = null;
    this.roundStatusMessage = null;
    this.bracketsWrapper = null;
  }

  set data(data) {
    this.#state.roundNumber = data.round_number;
    this.#state.round = data.round;
    this.#state.status = data.status;
    this.render();
  }

  render() {
    this.innerHTML = this.template();
    this.roundNumberElement = this.querySelector('#round-number');
    this.roundStatusMessage = this.querySelector('#round-status-message');
    this.bracketsWrapper = this.querySelector('#brackets-wrapper');

    this.roundNumberElement.textContent = `Round ${this.#state.roundNumber}`;
    this.roundStatusMessage.textContent = this.#messages[this.#state.status];
    this.renderBrackets();
    
    if (this.#state.status === 'finished') {
      setTimeout(() => {
        this.roundFinished();
      }, 3000);
    } else {
      // TODO: Add event listener for ws match finished
    }
    
    // For test
    setTimeout(() => {
      this.roundFinished();
    }, 3000);
  }

  renderBrackets() {
    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      const bracket = document.createElement('div');
      bracket.classList.add('d-flex', 'flex-column', 'align-items-start', 'mx-2', 'mb-3', 'gap-1');

      const player1 = document.createElement('participant-element');
      const scoreP1 = this.#state.round.brackets[i].status === 'finished' ? this.#state.round.brackets[i].score_p1 : '';
      player1.data = {
        participant: this.#state.round.brackets[i].participant1,
        score: scoreP1,
      };
      const player2 = document.createElement('participant-element');
      const scoreP2 = this.#state.round.brackets[i].status === 'finished' ? this.#state.round.brackets[i].score_p2 : '';
      player2.data = {
        participant: this.#state.round.brackets[i].participant2,
        score: scoreP2,
      };
      if (this.#state.round.brackets[i].winner.profile) {
        this.#state.round.brackets[i].winner.profile.username ===
        this.#state.round.brackets[i].participant1.profile.username ? (
            player1.classList.add('bracket-player-winner'),
            player2.classList.add('bracket-player-loser')
          ) : (
            player1.classList.add('bracket-player-loser'),
            player2.classList.add('bracket-player-winner')
          );
      }
      bracket.appendChild(player1);
      bracket.appendChild(player2);
      this.bracketsWrapper.appendChild(bracket);
    }
  }

  roundFinished() {
    devLog(`Round ${this.#state.roundNumber} finished`);
    this.roundStatusMessage.textContent = this.#messages.roundFinished;
    const scoreElements = this.querySelectorAll('.player-score');
    const loserElements = this.querySelectorAll('.bracket-player-loser');
    scoreElements.forEach((score) => {
      score.classList.add('d-none');
    });
    loserElements.forEach((loser) => {
      flyAway(loser);
    });
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <h3 class="text-center mb-3" id="round-number">Round 1</h3>
      <p class="text-center mb-5" id="round-status-message"></p>
      <div class="d-flex flex-row flex-wrap justify-content-center my-3 px-4 gap-4" id="brackets-wrapper"></div>
    </div>
    `;
  }
}

customElements.define('tournament-round-ongoing', TournamentRoundOngoing);
