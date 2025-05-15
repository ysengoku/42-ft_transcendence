import { BREAKPOINT } from '@utils';

export class TournamentOverviewFinished extends HTMLElement {
  #state = {
    status: '', // ongoing, finished
    // roundsCount: 0,
    rounds: null,
  }

  constructor() {
    super();
  }

  set data(data) {
    this.#state.status = data.status;
    this.#state.rounds = data.rounds;
    // this.#state.roundsCount = this.#state.rounds.length;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
    this.tournamentOverviewContent = this.querySelector('#tournament-overview-content-wrapper');

    this.#state.rounds.forEach((round) => {
      this.renderBrackets(round);
    });
  }
  
  renderBrackets(round) {
    // console.log('renderBrackets', round);
    const roundElement = document.createElement('div');
    roundElement.classList.add('round-wrapper', 'd-flex', 'flex-column', 'justify-content-around');    
    const bracketPairsCount = Math.floor(round.brackets.length / 2);
    let bracketIndex = 0;
    // console.log('Bracket pairs count', bracketPairsCount);
    if (bracketPairsCount !== 0) {
      for(let i = 0; i < bracketPairsCount; i++) {
        const bracketPairElement = document.createElement('div');
        bracketPairElement.innerHTML = this.bracketsPairTemplate();
        const bracketsWrapper = bracketPairElement.querySelector('.brackets-wrapper');
  
        const bracket1 = round.brackets[bracketIndex];
        const bracket2 = round.brackets[bracketIndex + 1];
        const bracket1Element = this.createBracketElement(bracket1);
        const bracket2Element = this.createBracketElement(bracket2);
        bracketsWrapper.appendChild(bracket1Element);
        bracketsWrapper.appendChild(bracket2Element);
        roundElement.appendChild(bracketPairElement);
        bracketIndex += 2;
      }
    } else {
      console.log('Final Bracket', bracketIndex, round.brackets[bracketIndex]);
      const finalBracketElement = this.createBracketElement(round.brackets[bracketIndex]);
      console.log('Final Bracket Element', finalBracketElement);
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
    // console.log('Bracket', bracket);
    const bracketElement = document.createElement('div');
    bracketElement.classList.add('d-flex', 'flex-column', 'align-items-start', 'w-100', 'mb-3');
    const player1 = this.createPlayerElement(bracket.participant1, bracket.score_p1);
    const player2 = this.createPlayerElement(bracket.participant2, bracket.score_p2);
    bracketElement.appendChild(player1);
    bracketElement.appendChild(player2);
    return bracketElement;
  }

  createPlayerElement(player, score) {
    const element = document.createElement('div');
    element.innerHTML = this.participantTemplate();
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
    <div class="d-flex flex-row justify-content-center align-items-center w-100 gap-5" id="tournament-overview-content-wrapper"></div>
    `;
  }

  style() {
    return `
    <style>
    .bracket-pair {
      div {
        display: inline-block;
        vertical-align: middle;
      }
    }
    .brackets-connector .brackets-connector-merger,
    .brackets-connector .brackets-connector-line {
      box-sizing: border-box;
      display: inline-block;
      vertical-align: top;
      width: 2rem;
    }
    .brackets-connector .brackets-connector-line {
      border-bottom: thin solid var(--bs-body-color);
    }
    .brackets-connector .brackets-connector-merger {
      position: relative;
    }
    .brackets-connector .brackets-connector-merger::before,
    .brackets-connector .brackets-connector-merger::after {
      content: "";
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 50%;
      border: 0 solid var(--bs-body-color);
    }
    .brackets-connector .brackets-connector-merger::before {
      border-right-width: thin;
      border-top-width: thin;
    }
    .brackets-connector .brackets-connector-merger::after {
      border-right-width: thin;
      border-bottom-width: thin;
    }
    .bracket-player {
      background-color: rgba(var(--bs-body-bg-rgb), 0.6);
      border-radius: .4rem;
      margin-bottom: .2rem;
      width: 160px;
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
    <div class="bracket-pair w-100">
      <div class="brackets-wrapper"></div>
      <div class="brackets-connector">
        <div class="brackets-connector-merger"></div>
        <div class="brackets-connector-line"></div>
      </div>
    </div>
    `;
  }

  participantTemplate() {
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

customElements.define('tournament-overview-finished', TournamentOverviewFinished);
