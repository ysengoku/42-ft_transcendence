export class GameScore extends HTMLElement {
  #navbarHeight = 64;
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

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      this.#navbarHeight = navbar.offsetHeight;
    }
  }

  connectedCallback() {
    this.render();
  }

  setNames(player1, player2) {
    this.#state.name.player1 = player1;
    this.#state.name.player2 = player2;
  }

  updateScore(playerNumber, score) {
    if (playerNumber === 1) {
      this.#state.score.player1 = score;
      this.scorePlayer1.classList.add('scored');
      setTimeout(() => {
        this.scorePlayer1.classList.remove('scored');
      }, 1000);
    } else if (playerNumber === 2) {
      this.#state.score.player2 = score;
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
    <div id="scoreboard-wrapper" class="d-flex flex-row justify-content-center align-items-end p-3 gap-2">
      <div class="d-flex flex-column align-items-center">
        <p id="game-name-player1" class="game-player-name m-0"></p>
        <p id="game-score-player1" class="game-score fs-1 m-0">5</p>
      </div>
      <p class="fs-2 fw-bold mx-2 my-1">:</p>
      <div class="d-flex flex-column align-items-center">
        <p id="game-name-player2" class="game-player-name m-0"></p>
        <p id="game-score-player2" class="game-score fs-1 m-0"></p>
      </div>
    </div>
  `;
  }

  style() {
    return `
    <style>
    #scoreboard-wrapper {
      position: absolute;
      top: ${this.#navbarHeight}px;
      right: 16px;
    }
    .game-score {
      font-family: 'van dyke';
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
