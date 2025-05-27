import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import { mockTournamentDetail } from '@mock/functions/mockTournamentDetail';

export class Tournament extends HTMLElement {
  #state = {
    user: null,
    status: '', // Status for UI: pending, roundStart, waitingNextRound, roundFinished, finished
    tournamentId: '',
    tournament: null,
    currentRoundNumber: 1,
    currentRound: null,
    currentUserBracket: null,
    userDataInTournament: null,
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
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      showAlertMessageForDuration(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED);
      router.redirect('/login');
      return;
    }
    this.#state.user = authStatus.response;
    if (this.#state.user.tournament_id !== this.#state.tournamentId) {
      devLog('User is not in this tournament');
      router.redirect('/tournament-menu');
      return;
    }
    await this.fetchTournamentData();
  }

  async fetchTournamentData() {
    // const response = await apiRequest(
    //   'GET',
    //   /* eslint-disable-next-line new-cap */
    //   API_ENDPOINTS.TOURNAMENT(this.#state.tournamentId),
    //   null,
    //   false,
    //   true,
    // );
    // if (!response.success) {
    //   // TODO: handle error
    //   return;
    // }
    // this.#state.tournament = response.data;

    // For test
    this.#state.tournament = await mockTournamentDetail('mockidongoing');
    console.log('Tournament data fetched:', this.#state.tournament);

    this.#state.currentRoundNumber = this.#state.tournament.rounds.length;
    this.#state.currentRound = this.#state.tournament.rounds[this.#state.currentRoundNumber - 1];
    this.#state.currentUserBracket = this.#state.currentRound.brackets.find((bracket) => {
      return (bracket.participant1.profile.username.toLowerCase() === this.#state.user.username.toLowerCase() ||
        bracket.participant2.profile.username.toLowerCase() === this.#state.user.username.toLowerCase());
    });
    this.setTournamentStatus[this.#state.tournament.status]();

    this.#state.userDataInTournament = this.#state.tournament.participants.find((participant) => {
      return participant.profile.username.toLowerCase() === this.#state.user.username.toLowerCase();
    });
    if (!this.#state.userDataInTournament) {
      devLog('User is not in this tournament');
      router.redirect('/tournament-menu');
      return;
    }
    const isUserQualified = this.checkUserStatus();
    if (!isUserQualified) {
      return;
    }

    this.render();
    // TODO: open ws for this tournament if not already opened
  }

  checkUserStatus() {
    switch (this.#state.userDataInTournament.status) {
    case 'playing':
      const gameId = this.#state.currentUserBracket.game_id;
      router.navigate(`multiplayer-game/${gameId}`);
      return false;
    case 'eliminated':
      showAlertMessageForDuration(ALERT_TYPE.LIGHT, 'You have been eliminated from the tournament.');
      router.navigate('/tournament-menu');
      return false;
    case 'qualified':
      return true;
    }
  }

  setTournamentStatus = {
    pending: () => {
      this.#state.status = 'pending';
    },
    ongoing: () => {
      // Current round
      // if starting -> roundStarting
      // if finished -> roundFinished
      // if ongoing && Current user's bracket === finished -> waitingNextRound

      // Temporary status for ongoing tournaments
      this.#state.status = 'waitingNextRound';
    },
    finished: () => {
      this.#state.status = 'finished';
    },
  };

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();
    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentContentWrapper = this.querySelector('#tournament-content');

    this.tournamentName.textContent = this.#state.tournament.name;
    this.updateTournamentStatus();

    // ----- Test for round_start -----
    // const dataMock = mockRoundStartData();
    // this.handleRoundStart(dataMock);
  }

  tournamentContent = {
    pending: () => {
      const tournamentWaiting = document.createElement('tournament-pending');
      tournamentWaiting.data = {
        id: this.#state.tournamentId,
        required_participants: this.#state.tournament.required_participants,
        participants: this.#state.tournament.participants,
      };
      return tournamentWaiting;
    },
    roundStarting: () => {
      const tournamentRoundStart = document.createElement('tournament-round-start');
      tournamentRoundStart.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
      };
      return tournamentRoundStart;
    },
    roundOngoing: () => {
      const tournamentRoundOngoing = document.createElement('tournament-round-ongoing');
      tournamentRoundOngoing.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
        status: this.#state.status,
      };
      return tournamentRoundOngoing;
    },
    finished: () => {
      // Show the final result of the tournament with tree
    },
  };

  updateTournamentStatus() {
    if (this.tournamentContentWrapper.firstChild) {
      this.tournamentContentWrapper.removeChild(this.tournamentContentWrapper.firstChild);
    }
    if (this.#state.status === 'finished') {
      router.redirect(`/tournament-overview/${this.#state.tournamentId}`);
      return;
    }
    let content = null;
    if (this.#state.status === 'waitingNextRound' || this.#state.status === 'roundFinished') {
      content = this.tournamentContent.roundOngoing();
    } else {
      content = this.tournamentContent[this.#state.status]();
    }
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
    <style>
    participant-element {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .tournament-status {
      color: var(--pm-text-green);
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
    .bracket-player-loser {
      opacity: 0.5;
    }
    .player-alias {
      min-width: 104px;
    }
    .player-score {
      width: 1.2rem;
      margin-left: 0.1rem !important;
    }
    </style>
    `;
  }
}

customElements.define('tournament-room', Tournament);

// Status: pending
// - redirected from tournament menu --> [TournamentWaiting view]
// - new_registration message via WebSocket

// - tournament_canceled message via WebSocket

// Status: ongoing (except during the match)
// - round_start message via WebSocket --> [RoundStart view]
// countdown, then redirected to the match page

// - match_finished message via WebSocket
// (receive on Game page when the user's own match is finished) --> [RoundWaiting view]
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
