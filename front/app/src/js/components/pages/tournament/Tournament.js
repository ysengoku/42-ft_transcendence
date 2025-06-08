/**
 * @module Tournament
 * @description Tournament page component that handles tournament data for participants.
 * This component fetches tournament data, manages tournament status, and renders the tournament view.
 * It also handles WebSocket messages related to the tournament.
 */

import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { socketManager } from '@socket';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE, sessionExpiredToast } from '@utils';
import { UI_STATUS, TOURNAMENT_STATUS, ROUND_STATUS, BRACKET_STATUS, PARTICIPANT_STATUS } from './tournamentStatus';
import { mockFetchTournament } from '@mock/functions/mockFetchTournament';

export class Tournament extends HTMLElement {
  /**
   * Private state object to hold tournament data and user information.
   * @property {Object} user - The authenticated user object.
   * @property {string} uiStatus - The current UI status of the tournament.
   * @property {string} tournamentId - The ID of the tournament.
   * @property {Object} tournament - The tournament data object.
   * @property {number} currentRoundNumber - The current round number in the tournament.
   * @property {Object} currentRound - The current round data object.
   * @property {Object} currentUserBracket - Data of the bracket in which the user is participating.
   * @property {Object} userDataInTournament - Data of the user in the tournament.
   */
  #state = {
    user: null,
    uiStatus: '',
    tournamentId: '',
    tournament: null,
    currentRoundNumber: 0,
    currentRound: null,
    currentUserBracket: null,
    userDataInTournament: null,
  };

  constructor() {
    super();

    this.tournamentName = null;
    this.tournamentContentWrapper = null;
  }

  /**
   * Called by router to pass parameters set in URL to the component.
   * This method checks if the user is authenticated, fetches tournament data,
   * and updates the UI accordingly.
   * If the tournament ID is not provided, it displays a "Page Not Found" message.
   * If the user is not authenticated or not in the tournament, it redirects to the login page or tournament menu.
   * @param {*} param - The parameters from the URL, expected to contain an `id` for the tournament.
   * @returns {Promise<void>} - A promise that resolves when the tournament data is fetched and the UI is updated.
   */
  async setParam(param) {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    this.#state.user = authStatus.response;
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = notFound.outerHTML;
      return;
    }
    this.#state.tournamentId = param.id;
    // if (this.#state.user.tournament_id !== this.#state.tournamentId) {
    //   devLog('User is not in this tournament');
    //   router.redirect('/tournament-menu');
    //   return;
    // }
    await this.fetchTournamentData();
  }

  /**
   * Fetches tournament data from the API using the tournament ID stored in the state.
   * If the fetch is successful, it updates the state with the tournament data and user data in the tournament.
   * If the tournament status is pending or canceled, it sets the UI status accordingly.
   * If the tournament is ongoing, it sets the current round and user bracket data.
   * If the user is qualified, it updates the UI status and renders the tournament view.
   * @returns {Promise<void>} - A promise that resolves when the tournament data is fetched and the UI is updated.
   */
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

    // =========== For test ================================================
    // pending, tournamentStarting, waitingNextRound, roundStarting, roundEnd
    this.#state.tournament = await mockFetchTournament(this.#state.user.username, 'waitingNextRound');
    // =====================================================================
    console.log('Tournament data fetched:', this.#state.tournament);

    // Find user data in the tournament participants
    this.#state.userDataInTournament = this.#state.tournament.participants.find((participant) => {
      return participant.profile.username.toLowerCase() === this.#state.user.username.toLowerCase();
    });
    devLog('User data in tournament:', this.#state.userDataInTournament);
    if (!this.#state.userDataInTournament) {
      devLog('User is not in this tournament');
      router.redirect('/tournament-menu');
      return;
    }

    if (this.#state.tournament.status === TOURNAMENT_STATUS.FINISHED) {
      socketManager.closeSocket('tournament', this.#state.tournamentId);
      router.redirect(`/tournament-overview/${this.#state.tournamentId}`);
      return;
    }
    if (
      this.#state.tournament.status === TOURNAMENT_STATUS.PENDING ||
      this.#state.tournament.status === TOURNAMENT_STATUS.CANCELED
    ) {
      this.setUIStatus[this.#state.tournament.status]();
    } else {
      this.#state.currentRoundNumber = this.#state.tournament.rounds.length;
      this.#state.currentRound = this.#state.tournament.rounds[this.#state.currentRoundNumber - 1];
      this.findAssignedBracketForUser();
      console.log('Current user bracket:', this.#state.currentUserBracket);

      this.setUIStatus[this.#state.tournament.status]();
      console.log('UI status set to:', this.#state.uiStatus);
      const isUserQualified = this.checkUserStatus();
      if (!isUserQualified) {
        return;
      }
    }
    this.render();
    if (this.#state.uiStatus !== UI_STATUS.CANCELED) {
      socketManager.openSocket('tournament', this.#state.tournamentId);
    }
  }

  findAssignedBracketForUser() {
    this.#state.currentUserBracket = this.#state.currentRound.brackets.find((bracket) => {
      return (
        bracket.participant1.profile.username.toLowerCase() === this.#state.user.username.toLowerCase() ||
        bracket.participant2.profile.username.toLowerCase() === this.#state.user.username.toLowerCase()
      );
    });
  }

  checkUserStatus() {
    const userDataInBracket = this.#state.currentUserBracket.participant1.profile.username === this.#state.user.username ? this.#state.currentUserBracket.participant1 : this.#state.currentUserBracket.participant2;
    switch (userDataInBracket.status) {
      case PARTICIPANT_STATUS.PLAYING:
        const gameId = this.#state.currentUserBracket.game_id;
        // router.redirect(`multiplayer-game/${gameId}`);
        return false;
      case PARTICIPANT_STATUS.ELIMINATED:
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, 'You have been eliminated from the tournament.');
        socketManager.closeSocket('tournament', this.#state.tournamentId);
        router.navigate('/tournament-menu');
        return false;
      case PARTICIPANT_STATUS.QUALIFIED:
        return true;
      case PARTICIPANT_STATUS.STARTING:
        return true;
    }
  }

  setUIStatus = {
    pending: () => {
      this.#state.uiStatus = UI_STATUS.PENDING;
    },
    ongoing: () => {
      switch (this.#state.currentRound.status) {
        case ROUND_STATUS.STARTING:
          this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
          break;
        case ROUND_STATUS.FINISHED:
          this.#state.uiStatus = UI_STATUS.ROUND_FINISHED;
          break;
        case ROUND_STATUS.ONGOING:
          console.log('Current round is ongoing:', this.#state.currentUserBracket.status);
          if (this.#state.currentUserBracket.status === BRACKET_STATUS.ONGOING) {
            this.#state.uiStatus = UI_STATUS.BRACKET_ONGOING;
          } else {
            this.#state.uiStatus = UI_STATUS.WAITING_NEXT_ROUND;
          }
          break;
      }
    },
    canceled: () => {
      this.#state.uiStatus = UI_STATUS.CANCELED;
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
    this.updateContentOnStatusChange();
  }

  /**
   * Creates the content for the tournament based on its current status.
   * It uses a mapping of status to content creation functions.
   * Each function returns a custom element that represents the current state of the tournament.
   */
  tournamentContent = {
    pending: () => {
      const tournamentWaiting = document.createElement('tournament-pending');
      tournamentWaiting.data = {
        id: this.#state.tournamentId,
        required_participants: this.#state.tournament.required_participants,
        participants: this.#state.tournament.participants,
        creatorUsername: this.#state.tournament.creator.username,
        loggedInUsername: this.#state.user.username,
      };
      return tournamentWaiting;
    },
    roundStarting: () => {
      const tournamentRoundStart = document.createElement('tournament-round-start');
      tournamentRoundStart.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
        game_id: this.#state.currentUserBracket.game_id,
      };
      return tournamentRoundStart;
    },
    roundOngoing: () => {
      const tournamentRoundOngoing = document.createElement('tournament-round-ongoing');
      tournamentRoundOngoing.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
        status: this.#state.uiStatus,
      };
      return tournamentRoundOngoing;
    },
    canceled: () => {
      const tournamentCanceled = document.createElement('tournament-canceled');
      tournamentCanceled.data = {
        tournamentId: this.#state.tournamentId,
        creatorUsername: this.#state.tournament.creator.username,
      };
      return tournamentCanceled;
    },
  };

  updateContentOnStatusChange() {
    if (this.tournamentContentWrapper.firstChild) {
      this.tournamentContentWrapper.removeChild(this.tournamentContentWrapper.firstChild);
    }
    let content = null;
    if (this.#state.uiStatus === UI_STATUS.WAITING_NEXT_ROUND || this.#state.uiStatus === UI_STATUS.ROUND_FINISHED) {
      content = this.tournamentContent.roundOngoing();
    } else {
      content = this.tournamentContent[this.#state.uiStatus]();
    }
    if (content) {
      this.tournamentContentWrapper.appendChild(content);
    } else {
      devErrorLog(`Tournament status not found: ${this.#state.uiStatus}`);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      WebSocket message handling                                          */
  /* ------------------------------------------------------------------------ */
  handleTournamentStart(data) {
  }

  handleRoundStart(data) {
    // Handle round_start message with [ROUND] data via ws

    // In scoketManager
    // If the user is not on the tournament page, automatically navigate to the tournament page?

    this.#state.currentRoundNumber = data.round.number;
    this.#state.currentRound = data.round;

    // if (this.#state.currentRoundNumber === 1) {
    //   this.#state.tournament.status = 'ongoing';
    // }
    this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
    this.updateContentOnStatusChange();
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
    // Show a message
    // Redirect to tournament overview page
  }

  async cancelTournament() {
    if (this.#state.tournament.creator.username !== this.#state.user.username) {
      return;
    }
    const response = await apiRequest(
      'DELETE',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT(this.#state.tournamentId),
      null,
      false,
      true,
    );
    if (!response.success) {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg);
      return;
    }
    showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Tournament cancelled successfully.');
    this.#state.uiStatus = UI_STATUS.CANCELED;
    this.updateContentOnStatusChange();
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <tournament-modal></tournament-modal>
        <div class="form-container col-12 col-xl-8 p-3">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4">
            <h2 class="text-center mt-2 mb-0 py-2 w-100" id="tournament-name"></h2>
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
