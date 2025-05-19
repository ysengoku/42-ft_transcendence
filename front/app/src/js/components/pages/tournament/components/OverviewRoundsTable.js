export class TournamentOverviewTable extends HTMLElement {
  #state = {
    rounds: null,
    roundsCount: 0,
  }

  constructor() {
    super();
  }

  set data(data) {
    this.#state.rounds = data;
    const requiredParticipants = this.#state.rounds[0].brackets.length * 2;
    this.#state.roundsCount = Math.log2(requiredParticipants);
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.tournamentOverviewContent = this.querySelector('#tournament-overview-content-wrapper');
    for (let i = 0; i < this.#state.rounds.length; i++) {
      this.renderRound(i);
    }
  }

  renderRound(index) {
    const roundTemplate = document.createElement('div');
    roundTemplate.innerHTML = this.roundTemplate();
    const roundElement = roundTemplate.firstElementChild;

    const roundNumber = index === this.#state.roundsCount - 1 ? 'Final' : `Round ${index + 1}`;
    const roundNumberElement = roundElement.querySelector('.round-number');
    roundNumberElement.textContent = roundNumber;

    const bracketsWrapper = roundElement.querySelector('.brackets-wrapper');
    const brackets = this.#state.rounds[index].brackets;
    console.log(brackets);
    brackets.forEach((bracket) => {
      const bracketElement = this.createBracketElement(bracket);
      bracketsWrapper.appendChild(bracketElement);
    });

    roundElement.appendChild(bracketsWrapper);
    this.tournamentOverviewContent.appendChild(roundElement);
  }

  createBracketElement(bracket) {
    const bracketElement = document.createElement('div');
    bracketElement.classList.add('d-flex', 'flex-column', 'align-items-center', 'mx-3', 'my-2');
    const player1 = this.createPlayerElement(bracket.participant1, bracket.score_p1);
    const player2 = this.createPlayerElement(bracket.participant2, bracket.score_p2);
    bracketElement.appendChild(player1);
    bracketElement.appendChild(player2);
    return bracketElement;
  }

  createPlayerElement(player, score) {
    const element = document.createElement('div');
    element.innerHTML = this.playerTemplate();
    element.classList.add('d-flex', 'justify-content-center', 'align-items-center');
    const avatarElement = element.querySelector('img');
    avatarElement.src = player.user.avatar;
    const aliasElement = element.querySelector('.player-alias');
    aliasElement.textContent = player.alias;
    if (player.status === 'winner') {
      element.classList.add('bracket-player-winner')
    } else if (player.status === 'eliminated') {
      element.classList.add('bracket-player-loser')
    }
    const scoreElement = element.querySelector('.player-score');
    scoreElement.textContent = score;
    return element;
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center w-100 mt-4" id="tournament-overview-content-wrapper"></div>
    `;
  }

  style() {
    return `
    <style>
    .player-score {
      width: 1.5rem;
      margin-left: 0.1rem !important;
    }
    hr {
      border: 0;
      height: 2px;
      bckground-position: 50%;
      box-sizing: border-box;
      }
    .line-left,
    .line-right {
      --color: var(--bs-body-color-rgb);
      color: var(--color);
    }
    .line-left {
      background-image: linear-gradient(90deg, rgba(var(--color), 0), rgba(var(--color), 0.5) 20%, rgba(var(--color), 1) 100%);
    }
    .line-right {
      background-image: linear-gradient(90deg, rgba(var(--color), 1), rgba(var(--color), 0.5) 80%, rgba(var(--color), 0) 100%);
    }
    </style>`;
  }

  roundTemplate() {
    return `
    <div class="round-wrapper d-flex flex-column align-items-center w-100 'my-3">
      <div class="d-flex flex-row align-items-center justify-content-center mt-4  mb-1 w-75">
        <hr class="line-left flex-grow-1 my-0">
        <p class="round-number m-0 px-3 fs-5 fw-bold"></p>
        <hr class="line-right flex-grow-1 my-0">
      </div>
      <div class="brackets-wrapper d-flex flex-row flex-wrap justify-content-center px-4"></div>
    </div>
    `;
  }

  playerTemplate() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center w-100">
      <div class="bracket-player d-flex flex-row justify-content-center align-items-center p-2 gap-1">
        <img class="player-avatar avatar-xxs rounded-circle" alt="Participant avatar" />
        <p class="player-alias m-0"></div>
      </div>
      <p class="player-score text-center my-0 fw-bold"></p>
    </div>
    `;
  }
}

customElements.define('tournament-overview-table', TournamentOverviewTable);
