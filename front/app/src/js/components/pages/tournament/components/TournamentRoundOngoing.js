/**
 * @module TournamentRoundOngoing
 * @description Component to display the ongoing tournament round with brackets and match status.
 * It is shown only to the users who are participating in the tournament and finished their matches of the current round.
 * Each time a match is finished, the component updates the bracket and displays the result until the current round ends.
 */

import { BRACKET_STATUS } from '../tournamentStatus';
import { flyAway } from '@utils';

export class TournamentRoundOngoing extends HTMLElement {
  #state = {
    roundNumber: 1,
    round: null,
    onGoingBracketCount: 0,
  };

  constructor() {
    super();
    this.roundNumberElement = null;
    this.roundStatusMessage = null;
    this.bracketsWrapper = null;

    this.updateBracket = this.updateBracket.bind(this);
  }

  set data(data) {
    this.#state.roundNumber = data.round_number;
    this.#state.round = data.round;

    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      if (this.#state.round.brackets[i].status === BRACKET_STATUS.ONGOING) {
        this.#state.onGoingBracketCount++;
      }
    }
  }

  get onGoingBracketCount() {
    return this.#state.onGoingBracketCount;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    // document.removeEventListener('tournament-match-finished', this.updateBracket);
  }

  render() {
    this.innerHTML = this.template();
    this.roundNumberElement = this.querySelector('#round-number');
    this.roundStatusMessage = this.querySelector('#round-status-message');
    this.bracketsWrapper = this.querySelector('#brackets-wrapper');

    this.roundNumberElement.textContent = `Round ${this.#state.roundNumber}`;
    this.roundStatusMessage.textContent = 'Waiting for all Gunslingers to complete their matches.';
    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      const bracketElement = document.createElement('bracket-element');
      bracketElement.data = this.#state.round.brackets[i];
      this.bracketsWrapper.appendChild(bracketElement);
    }
  }

  /**
   * @description Updates the bracket element with the match result.
   * It is called when a match is finished and the result is received from the server.
   */
  updateBracket(matchData) {
    const bracketElement = this.querySelector(`#bracket-${matchData.bracket.game_id}`);
    if (!bracketElement) {
      devErrorLog('Bracket element not found for game_id:', matchData.bracket.game_id);
      return;
    }
    const player1 = bracketElement.querySelector('.bracket-player-1');
    const scoreP1 = player1.querySelector('.player-score');
    const player2 = bracketElement.querySelector('.bracket-player-2');
    const scoreP2 = player2.querySelector('.player-score');
    if (matchData.bracket.winner && matchData.bracket.winner.profile) {
      matchData.bracket.winner.profile.alias === matchData.bracket.participant1.alias
        ? (
          player1.classList.add('bracket-player-winner'),
          player2.classList.add('bracket-player-loser')
          // TODO: Activate after the update on backend is ready
          // scoreP1.textContent = matchData.bracket.winners_score,
          // scoreP2.textContent = matchData.bracket.losers_score
        ) : (
          player1.classList.add('bracket-player-loser'),
          player2.classList.add('bracket-player-winner')
          // TODO: Activate after the update on backend is ready
          // scoreP1.textContent = matchData.bracket.losers_score,
          // scoreP2.textContent = matchData.bracket.winners_score
        );
    }
    // TODO: Remove after the update on backend is ready
    scoreP1.textContent = matchData.bracket.score_p1;
    scoreP2.textContent = matchData.bracket.score_p2;
    scoreP1.classList.remove('d-none');
    scoreP2.classList.remove('d-none');
    for (let i = 0; i < this.#state.round.brackets.length; i++) {
      const bracket = this.#state.round.brackets[i];
      if (
        bracket.participant1.alias === matchData.bracket.participant1.alias &&
        bracket.participant2.alias === matchData.bracket.participant2.alias
      ) {
        bracket.status = 'finished';
        bracket.winner = matchData.winner;
        bracket.score_p1 = matchData.score_p1;
        bracket.score_p2 = matchData.score_p2;
        break;
      }
    }
    this.#state.onGoingBracketCount--;
  }

  roundFinishedAnimation() {
    devLog(`Round ${this.#state.roundNumber} finished`);
    this.roundStatusMessage.textContent = 'All Gunslingers have completed their matches. Preparing the next round.';
    return new Promise((resolve) => {
      const scoreElements = this.querySelectorAll('.player-score');
      const loserElements = this.querySelectorAll('.bracket-player-loser');
      scoreElements.forEach((score) => {
        score.classList.add('d-none');
      });
      loserElements.forEach((loser) => {
        flyAway(loser);
      });
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  template() {
    return `
    <div class="d-flex flex-column justify-content-center mt-3">
      <h3 class="text-center mb-3" id="round-number"></h3>
      <p class="text-center mb-5" id="round-status-message"></p>
      <div class="d-flex flex-row flex-wrap justify-content-center my-3 px-4 gap-4" id="brackets-wrapper"></div>
    </div>
    `;
  }
}

customElements.define('tournament-round-ongoing', TournamentRoundOngoing);
