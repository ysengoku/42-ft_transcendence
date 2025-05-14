import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';

export class Tournament extends HTMLElement {
  #state = {
    status: '', // waiting, starting, roundStart, waitingNextRound, roundFinished, finished
    tournamentId: '',
    tournament: null,
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
  }
  
  async fetchTournamentData() {
    // For test
    this.#state.tournament = await mockTournamentDetail('mockidlobby');
    
    this.#state.status = this.status[this.#state.tournament.status];
    this.render();
  }

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
    starting:() => {

    },
    roundStart:() => {

    },
    waitingNextRound:() => {
    },
    roundFinished:() => {
    },
    finished:() => {

    },
  }

  updateStatus() {
  }

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
