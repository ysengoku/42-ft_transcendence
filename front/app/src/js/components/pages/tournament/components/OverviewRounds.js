import { BREAKPOINT } from '@utils';

export class TournamentOverviewRounds extends HTMLElement {
  #state = {
    rounds: null,
  }

  constructor() {
    super();
    this.baseTop = 0;
  }

  set data(data) {
    this.#state.status = data.status;
    this.#state.rounds = data.rounds;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
    this.tournamentOverviewContent = this.querySelector('#tournament-overview-content-wrapper');

    for (let i = 0; i < this.#state.rounds.length; i++) {
      const round = this.#state.rounds[i];
      this.renderBrackets(round);
      if (i === this.#state.rounds.length - 1) {
        const lastRoundElement = this.querySelector('.round-wrapper:last-child');
        const connectors = lastRoundElement.querySelectorAll('.brackets-connector');
        connectors.forEach((connector) => {
          connector.classList.add('d-none');
        });
      }
    };
  }
  
  renderBrackets(round) {
    const roundElement = document.createElement('div');
    roundElement.classList.add('round-wrapper', 'd-flex', 'flex-column', 'justify-content-around');    
    const bracketPairsCount = Math.floor(round.brackets.length / 2);
    let bracketIndex = 0;
    if (bracketPairsCount !== 0) {
      for(let i = 0; i < bracketPairsCount; i++) {
        const temp = document.createElement('div');
        temp.innerHTML = this.bracketsPairTemplate();
        const bracketPairElement = temp.firstElementChild
        const bracketsWrapper = bracketPairElement.querySelector('.brackets-wrapper');
  
        const bracket1 = round.brackets[bracketIndex];
        const bracket2 = round.brackets[bracketIndex + 1];
        bracketIndex += 2;
        const bracket1Element = this.createBracketElement(bracket1);
        const bracket2Element = this.createBracketElement(bracket2);
        bracketsWrapper.appendChild(bracket1Element);
        bracketsWrapper.appendChild(bracket2Element);
        roundElement.appendChild(bracketPairElement);

        requestAnimationFrame(() => {
          const incomingLines = bracketPairElement.querySelector('.brackets-connector-incoming');
          const outboundLine   = bracketPairElement.querySelector('.brackets-connector-outbound');
          const bracketWrapper1 = bracketsWrapper.children[0];
          const bracketWrapper2 = bracketsWrapper.children[1];

          if (this.baseTop === 0) {
            this.baseTop = bracketPairElement.getBoundingClientRect().top;
          }
          const pairTop = i === 0 ? this.baseTop : bracketPairElement.getBoundingClientRect().top;
          const offset = (bracketPairElement.getBoundingClientRect().top - pairTop) / 2;

          const y1 = bracketWrapper1.getBoundingClientRect().top + bracketWrapper1.offsetHeight / 2 - pairTop - offset;
          const y2 = bracketWrapper2.getBoundingClientRect().top + bracketWrapper2.offsetHeight / 2 - pairTop + offset;
          incomingLines.style.setProperty('--y1', `${y1}px`);
          incomingLines.style.setProperty('--y2', `${y2}px`);
          const mid = (y1 + y2) / 2;
          outboundLine.style.top = `${mid}px`;
        });
      }
    } else {
      const finalBracketElement = this.createBracketElement(round.brackets[bracketIndex]);
      roundElement.appendChild(finalBracketElement);
    }
    this.tournamentOverviewContent.appendChild(roundElement);
    const roundElements = this.querySelectorAll('.round-wrapper');
    requestAnimationFrame(() => {
    const roundElementHeight = roundElements[0].offsetHeight;
      for (let i = 1; i < roundElements.length; i++) {
        roundElements[i].style.height = `${roundElementHeight}px`;
      }
    });
  }

  createBracketElement(bracket) {
    const bracketElement = document.createElement('div');
    bracketElement.classList.add('d-flex', 'flex-column', 'align-items-center', 'w-100', 'my-2');
    const player1 = this.createPlayerElement(bracket.participant1, bracket.score_p1);
    const player2 = this.createPlayerElement(bracket.participant2, bracket.score_p2);
    bracketElement.appendChild(player1);
    bracketElement.appendChild(player2);
    return bracketElement;
  }

  createPlayerElement(player, score) {
    const element = document.createElement('div');
    element.innerHTML = this.playerTemplate();
    element.classList.add('d-flex', 'justify-content-center', 'align-items-center', 'w-100');
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
    <div class="d-flex flex-row justify-content-center align-items-center w-100  mt-4 gap-5" id="tournament-overview-content-wrapper"></div>
    `;
  }

  style() {
    return `
    <style>
    .bracket-pair {
      padding-right: 2.5rem; 
    }
    .brackets-wrapper {
      flex: 0 0 auto;
    }
    .brackets-connector {
      display: flex;
      flex-direction: row;
      align-items: center;
      top: 0;
      bottom: 0;
      right: 0;
      width: 2rem
    }
    .brackets-connector-incoming {
      width: 2rem;
      left: 0;
      top: var(--y1);
      height: calc(var(--y2) - var(--y1));
      border-right: 1.5px solid var(--bs-body-color);
    }
    .brackets-connector-incoming::before,
    .brackets-connector-incoming::after {
      content: "";
      position: absolute;
      left: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .brackets-connector-incoming::before {
      top: 0;
      border-top: 1.5px solid var(--bs-body-color);
    }
    .brackets-connector-incoming::after {
      bottom: 0;
      border-bottom: 1.5px solid var(--bs-body-color);
    }
    .brackets-connector-outbound {
      left: 100%;
      top: var(--mid);
      width: 2rem;
      height: 0;
      border-top: 1.5px solid var(--bs-body-color);
    }
    .bracket-player {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: .4rem;
      margin-top: .1rem;
      margin-bottom: .1rem;
    }
    .bracket-player-winner {
      .bracket-player {
        background-color: var(--pm-primary-500);
      }
      .player-alias {
        color: var(--pm-primary-100);
      }
    }
    .player-alias {
      font-size: 0.8rem;
      min-width: 96px;
    }
    .player-score {
      width: 1.5rem;
      margin-left: 0.1rem !important;
    }
    @media (max-width: ${BREAKPOINT.MD}px) {
      .player-avatar {
        display: none;
      }
    }
    </style>
    `;
  }

  bracketsPairTemplate() {
    return `
    <div class="bracket-pair d-flex position-relative align-items-center w-100 h-100">
      <div class="brackets-wrapper d-flex flex-column justify-content-around h-100"></div>
      <div class="brackets-connector position-absolute h-100">
        <div class="brackets-connector-incoming position-absolute"></div>
        <div class="brackets-connector-outbound position-absolute"></div>
      </div>
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
      <p class="player-score text-end my-0 fw-bold"></p>
    </div>
    `;
  }
}

customElements.define('tournament-overview-rounds', TournamentOverviewRounds);
