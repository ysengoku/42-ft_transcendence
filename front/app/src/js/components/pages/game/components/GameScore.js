export class GameScore extends HTMLElement {
  #state = {
    name: {
      player1: 'Player1',
      player2: 'Player2',
    },
    score: {
      player1: 0,
      player2: 0,
    },
  };

  constructor() {
    super();

    this.namePlayer1 = null;
    this.namePlayer2 = null;
    this.scorePlayer1 = null;
    this.scorePlayer2 = null;
  }

  connectedCallback() {
    this.render();
  }

  setNames(player1, player2) {
    this.#state.name.player1 = player1;
    this.#state.name.player2 = player2;
    if (this.namePlayer1) {
      this.namePlayer1.textContent = this.#state.name.player1;
    }
    if (this.namePlayer2) {
      this.namePlayer2.textContent = this.#state.name.player2;
    }
  }

  updateScore(playerNumber, newScore) {
    if (playerNumber === 0) {
      if (this.#state.score.player1 === newScore) {
        return;
      }
      this.#state.score.player1 = newScore;
      if (this.scorePlayer1) {
        this.scorePlayer1.textContent = this.#state.score.player1;
        this.scorePlayer1.classList.add('scored');
        setTimeout(() => {
          this.scorePlayer1.classList.remove('scored');
        }, 1000);
      }
    } else if (playerNumber === 1) {
      if (this.#state.score.player2 === newScore) {
        return;
      }
      this.#state.score.player2 = newScore;
      if (this.scorePlayer2) {
        this.scorePlayer2.textContent = this.#state.score.player2;
        this.scorePlayer2.classList.add('scored');
        setTimeout(() => {
          this.scorePlayer2.classList.remove('scored');
        }, 1000);
      }
    }
  }

  render() {
    this.innerHTML = this.style() + this.template();

    this.namePlayer1 = this.querySelector('#game-name-player1');
    if (this.namePlayer1) {
      this.namePlayer1.textContent = this.#state.name.player1;
    }
    this.namePlayer2 = this.querySelector('#game-name-player2');
    if (this.namePlayer2) {
      this.namePlayer2.textContent = this.#state.name.player2;
    }
    this.scorePlayer1 = this.querySelector('#game-score-player1');
    if (this.scorePlayer1) {
      this.scorePlayer1.textContent = this.#state.score.player1;
    }
    this.scorePlayer2 = this.querySelector('#game-score-player2');
    if (this.scorePlayer2) {
      this.scorePlayer2.textContent = this.#state.score.player2;
    }
  }

  template() {
    return `
    <div id="scoreboard-wrapper" class="d-flex flex-row justify-content-center m-3">
      <div id="game-score-board" class="wood-board d-flex flex-row justify-content-center align-items-center px-2 py-1 gap-4">
        <div class="d-flex flex-column align-items-center justify-content-center">
          <p id="game-name-player1" class="game-player-name"></p>
          <p id="game-score-player1" class="game-score fs-2"></p>
        </div>
        <div id="game-timer-wrapper"></div>
        <div class="d-flex flex-column align-items-center justify-content-center">
          <p id="game-name-player2" class="game-player-name"></p>
          <p id="game-score-player2" class="game-score fs-2"></p>
        </div>
      </div>
    </div>
  `;
  }

  style() {
    return `
    <style>
    #scoreboard-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
    #game-score-board {
      display: inline-flex;
      width: fit-content;
      color: var(--pm-primary-100);
      font-family: 'van dyke';
      width: 24rem;
    }
    .game-player-name {
      font-family: 'Crimson Pro';
      font-weight: bold;
      margin-bottom: -.4rem;
    }
    .game-score {
      font-family: 'van dyke';
      margin-bottom: -.5rem;
    }
    .scored {
      transition-delay: 0s;
      transform: scale(1);
      animation: popup 0.6s ease;
    }
    @keyframes popup {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.5); }
      100% { transform: scale(1); }
    }
    </style>
    `;
  }
}

customElements.define('game-scoreboard', GameScore);
