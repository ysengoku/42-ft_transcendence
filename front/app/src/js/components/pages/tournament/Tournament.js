import { auth } from '@auth';
import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';
import { mockRoundStartData } from '@mock/functions/mockTournamentWs';

export class Tournament extends HTMLElement {
  #state = {
    status: '', // Status for UI: waiting, roundStart, waitingNextRound, roundFinished, finished
    tournamentId: '',
    tournament: null,
    currentRoundNumber: 1,
    currentRound: null,
  }

  // Convert the status fetched from the server to the status used in the component
  status = {
    lobby: 'waiting',
    ongoing: 'waitingNextRound',
    finished: 'finished',
  };

  constructor() {
    super();

    this.tournamentName = null;
    this.tournamentContentWrapper = null;
  }

  async setParam(param) {
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    this.#state.tournamentId = param.id;
    await this.fetchTournamentData();
    // TODO: open ws for this tournament
  }
  
  async fetchTournamentData() {
    // For test
    this.#state.tournament = await mockTournamentDetail('mockidlobby');
    
    this.#state.status = this.status[this.#state.tournament.status];
    this.render();
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentContentWrapper = this.querySelector('#tournament-content');

    this.tournamentName.textContent = this.#state.tournament.name;
    this.#state.status = this.status[this.#state.tournament.status];
    const content = this.tournamentContent[this.#state.status]();
    if (content) {
      this.tournamentContentWrapper.appendChild(content);
    } else {
      devErrorLog(`Tournament status not found: ${this.#state.status}`);
    }

    // ----- Test for round_start -----
    // const dataMock = mockRoundStartData();
    // this.handleRoundStart(dataMock);
  }

  tournamentContent = {
    waiting:() => {
      const tournamentWaiting = document.createElement('tournament-waiting');
      tournamentWaiting.data = {
        required_participants: this.#state.tournament.required_participants,
        participants: this.#state.tournament.participants
      };
      return tournamentWaiting;
    },
    roundStart:() => {
      const tournamentRoundStart = document.createElement('tournament-round-start');
      tournamentRoundStart.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
      };
      return tournamentRoundStart;
    },
    waitingNextRound:() => {
      // Show status/result of all matches of the current round
    },
    roundFinished:() => {
      // Show result of all matches of the current round
    },
    finished:() => {
      // Show the final result of the tournament with tree
    },
  }

  updateTournamentStatus() {
    if (this.tournamentContentWrapper.firstChild) {
      this.tournamentContentWrapper.removeChild(this.tournamentContentWrapper.firstChild);
    }
    const content = this.tournamentContent[this.#state.status]();
    if (content) {
      this.tournamentContentWrapper.appendChild(content);
    } else {
      devErrorLog(`Tournament status not found: ${this.#state.status}`);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  handleRoundStart(data) {
    // Handle round_start message with [ROUND] data via ws

    // In scoketManager
    // If the user is not in the tournament, automatically navigate to the tournament page

    this.#state.currentRoundNumber = data.round.number;
    this.#state.currentRound = data.round;
    
    if (this.#state.currentRoundNumber === 1) {
      this.#state.tournament.status = 'ongoing';
    }
    this.#state.status = 'roundStart';
    this.updateTournamentStatus();
  }

  handleMatchFinished() {
    // User comes back from the match
    // Receive match_finished message via ws with ROUND and user's own result

    // ??? If we change the URL tournament - match
    // In socketManager
    // Navigate to this page (tournament/id)

    // In this page
    // fetch tournament to get the tournament data
  }

  updateMatchResult(data) {
    // Handle match_result message with ROUND via ws
  }

  handleRoundEnd(data) {
    // Handle round_start message with [ROUND] data
  }

  handleTournamentFinished() {
    // Handle tournament_finished message via ws
    // fetch tournament to get the tournament data
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-xl-8 p-3">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4">
            <h2 class="text-center mt-1 mb-0 py-2 w-100" id="tournament-name"></h2>
            <div id="tournament-content"></div>
          </div>
        </div>
      </div>  
    </div>
    `;
  }

  style() {
    return `
    `;
  }
}

customElements.define('tournament-room', Tournament);

// Status: lobby
// - redirected from tournament menu --> [TournamentWaiting view]
// - new_registration message via WebSocket

// - tournament_canceled message via WebSocket

// Status: ongoing (except during the match)
// - round_start message via WebSocket --> [RoundStart view]
// countdown, then redirected to the match page

// - match_finished message via WebSocket (receive on Game page when the user's own match is finished) --> [RoundWaiting view]
// - match_result message via WebSocket --> Update [RoundWaiting view] adding new result
// - round_end message via WebSocket --> Update [RoundWaiting view] with the result of the round

// Repeat the process for the next round (round_start, match_finished, match_result, round_end)

// Status: finished
// - tournament_finished message via WebSocket --> [OverviewFinished view]?

// Integrate Game component in this page
// const game = document.createElement('multiplayer-game');
// this.appendChild(game);
// this.innerHTML = '';
// game.setParam({ id: this.#state.tournamentId });
