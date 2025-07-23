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
import { showTournamentAlert, TOURNAMENT_ALERT_TYPE } from '@components/pages/tournament/utils/tournamentAlert';
import anonymousAvatar from '/img/anonymous-avatar.png?url';

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
    creator: {
      username: '',
      avatar: anonymousAvatar,
      alias: 'anonymous gunslinger',
    },
    userDataInTournament: null,
    currentRoundNumber: 0,
    currentRound: null,
    currentUserBracket: null,
    currentRoundFinished: false,
    nextRound: null,
  };

  constructor() {
    super();

    this.tournamentName = null;
    this.tournamentContentWrapper = null;

    this.setCurrentRoundFinished = this.setCurrentRoundFinished.bind(this);
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
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
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
    await this.fetchTournamentData();
  }

  disconnectedCallback() {
    document.removeEventListener('tournament-round-finished-ui-ready', this.setCurrentRoundFinished);
  }

  /**
   * Fetches tournament data from the API using the tournament ID stored in the state.
   * If the fetch is successful, it updates the state with the tournament data and user data in the tournament.
   * If the tournament status is pending, it sets the UI status accordingly.
   * If the tournament is ongoing, it sets the current round and user bracket data.
   * If the user is qualified, it updates the UI status and renders the tournament view.
   * @returns {Promise<void>} - A promise that resolves when the tournament data is fetched and the UI is updated.
   */
  async fetchTournamentData() {
    const response = await apiRequest(
      'GET',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT(this.#state.tournamentId),
      null,
      false,
      true,
    );
    if (!response.success) {
      if (response.status === 404 || response.status === 422) {
        const notFound = document.createElement('page-not-found');
        this.innerHTML = notFound.outerHTML;
      }
      return;
    }
    this.#state.tournament = response.data;
    if (this.#state.tournament.tournament_creator) {
      this.#state.creator.username = this.#state.tournament.tournament_creator.profile.username;
      this.#state.creator.avatar = this.#state.tournament.tournament_creator.profile.avatar;
      this.#state.creator.alias = this.#state.tournament.tournament_creator.alias;
    }

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
    if (this.#state.userDataInTournament.status === PARTICIPANT_STATUS.ELIMINATED) {
      socketManager.closeSocket('tournament', this.#state.tournamentId);
      this.#state.uiStatus = UI_STATUS.ELIMINATED;
      this.render();
      showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.ELIMINATED, this.#state.tournament.name);
      setTimeout(() => {
        router.redirect(`/tournament-overview/${this.#state.tournamentId}`);
      }, 2000);
      return;
    }

    switch (this.#state.tournament.status) {
      case TOURNAMENT_STATUS.FINISHED:
        if (this.#state.userDataInTournament.status === PARTICIPANT_STATUS.WINNER) {
          devLog('Tournament finished and the user is the champion');
          socketManager.closeSocket('tournament', this.#state.tournamentId);
          requestAnimationFrame(() => {
            showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.CHAMPION, this.#state.tournament.name);
          });
          setTimeout(() => {
            router.redirect(`/tournament-overview/${this.#state.tournamentId}`);
          }, 3000);
        } else {
          // TODO: Check this
          showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.CANCELED);
          setTimeout(() => {
            router.redirect('/home');
          }, 3000);
        }
        return;
      case TOURNAMENT_STATUS.CANCELED:
        socketManager.closeSocket('tournament', this.#state.tournamentId);
        showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.CANCELED);
        setTimeout(() => {
          router.redirect(`/tournament-menu`);
        }, 2000);
        return;
      case TOURNAMENT_STATUS.PENDING:
        this.resolveUIStatus[this.#state.tournament.status]();
        break;
      default:
        this.findCurrentRound();
        this.#state.currentRound = this.#state.tournament.rounds[this.#state.currentRoundNumber - 1];
        this.findAssignedBracketForUser();
        devLog("Current user's bracket", this.#state.currentUserBracket);
        if (!this.#state.currentUserBracket) {
          devErrorLog('User is not assigned to any bracket in the current round');
          router.redirect('/home');
          return;
        }
        this.resolveUIStatus[this.#state.tournament.status]();
        const isUserQualified = this.checkUserStatus();
        if (!isUserQualified) {
          // showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.ELIMINATED, this.#state.tournament.name);
          // router.redirect('/home');
          return;
        }
    }

    devLog('UI status set to:', this.#state.uiStatus);
    this.render();
    socketManager.openSocket('tournament', this.#state.tournamentId);
  }

  findCurrentRound() {
    this.#state.currentRound = this.#state.tournament.rounds.find((round) => {
      return round.status === ROUND_STATUS.ONGOING || round.status === ROUND_STATUS.PENDING;
    });
    if (!this.#state.currentRound) {
      devErrorLog('No ongoing or pending round found in the tournament');
      return;
    }
    this.#state.currentRoundNumber = this.#state.tournament.rounds.indexOf(this.#state.currentRound) + 1;
    devLog('Current round found:', this.#state.currentRound);
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
    console.log('Checking user status in tournament:', this.#state.userDataInTournament);
    switch (this.#state.userDataInTournament.status) {
      case PARTICIPANT_STATUS.PLAYING:
        devLog('User is playing a match, redirecting to game page:', gameId);
        const gameId = this.#state.currentUserBracket.game_id;
        router.redirect(`multiplayer-game/${gameId}`);
        return false;
      case PARTICIPANT_STATUS.ELIMINATED:
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, 'You have been eliminated from the tournament.');
        socketManager.closeSocket('tournament', this.#state.tournamentId);
        router.navigate('/tournament-menu');
        return false;
      case PARTICIPANT_STATUS.QUALIFIED:
        return true;
      case PARTICIPANT_STATUS.PENDING:
        return true;
      default:
        devErrorLog('Unknown participant status');
        return false;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  resolveUIStatus = {
    [TOURNAMENT_STATUS.PENDING]: () => {
      this.#state.uiStatus = UI_STATUS.PENDING;
    },
    [TOURNAMENT_STATUS.ONGOING]: () => {
      switch (this.#state.currentRound.status) {
        case ROUND_STATUS.PENDING:
          this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
          break;
        case ROUND_STATUS.ONGOING:
          switch (this.#state.currentUserBracket.status) {
            case BRACKET_STATUS.PENDING:
              this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
              break;
            case BRACKET_STATUS.ONGOING:
              this.#state.uiStatus = UI_STATUS.BRACKET_ONGOING;
              break;
            case BRACKET_STATUS.FINISHED:
              this.#state.uiStatus = UI_STATUS.WAITING_NEXT_ROUND;
              break;
            case BRACKET_STATUS.CANCELED:
              this.#state.uiStatus = UI_STATUS.ERROR; // TODO: Consider error handling
              break;
            default:
              devErrorLog('Unknown bracket status:', this.#state.currentUserBracket.status);
          }
          break;
        default:
          devErrorLog(
            'Cannot resolve UI status. Round status:',
            this.#state.currentRound.status,
            'Current bracket status:',
            this.#state.currentUserBracket.status,
          );
      }
    },
    [TOURNAMENT_STATUS.CANCELED]: () => {
      this.#state.uiStatus = UI_STATUS.CANCELED;
    },
  };

  render() {
    this.innerHTML = '';
    this.innerHTML = this.style() + this.template();
    this.tournamentName = this.querySelector('#tournament-name');
    this.tournamentContentWrapper = this.querySelector('#tournament-content');

    this.tournamentName.textContent = this.#state.tournament.name;
    this.updateContentOnStatusChange();
    document.addEventListener('round-finished-ui-ready', this.setCurrentRoundFinished);
  }

  /**
   * Creates the content for the tournament based on its current status.
   * It uses a mapping of status to content creation functions.
   * Each function returns a custom element that represents the current state of the tournament.
   */
  tournamentContent = {
    [UI_STATUS.PENDING]: () => {
      const tournamentWaiting = document.createElement('tournament-pending');
      tournamentWaiting.data = {
        id: this.#state.tournamentId,
        required_participants: this.#state.tournament.required_participants,
        participants: this.#state.tournament.participants,
        creatorUsername: this.#state.creator.username,
        loggedInUsername: this.#state.user.username,
      };
      return tournamentWaiting;
    },
    [UI_STATUS.ROUND_STARTING]: () => {
      const tournamentRoundStart = document.createElement('tournament-round-start');
      const previousRound =
        this.#state.currentRoundNumber === 1 ? null : this.#state.tournament.rounds[this.#state.currentRoundNumber - 2];
      tournamentRoundStart.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
        previous_round: previousRound,
        game_id: this.#state.currentUserBracket.game_id,
      };
      devLog("User's Game id for the starting round:", this.#state.currentUserBracket.game_id);
      return tournamentRoundStart;
    },
    [UI_STATUS.WAITING_NEXT_ROUND]: () => {
      const tournamentRoundOngoing = document.createElement('tournament-round-ongoing');
      tournamentRoundOngoing.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
      };
      return tournamentRoundOngoing;
    },
    [UI_STATUS.BRACKET_ONGOING]: () => {
      const tournamentBracketOngoing = document.createElement('tournament-bracket-ongoing');
      tournamentBracketOngoing.data = {
        round_number: this.#state.currentRoundNumber,
        round: this.#state.currentRound,
        game_id: this.#state.currentUserBracket.game_id,
      };
      return tournamentBracketOngoing;
    },
    [UI_STATUS.CANCELED]: () => {
      const tournamentExit = document.createElement('tournament-exit');
      tournamentExit.data = {
        status: UI_STATUS.CANCELED,
        creatorAlias: this.#state.creator.alias,
      };
      return tournamentExit;
    },
    [UI_STATUS.ELIMINATED]: () => {
      const tournamentExit = document.createElement('tournament-exit');
      tournamentExit.data = {
        status: UI_STATUS.ELIMINATED,
        tournamentId: this.#state.tournamentId,
      };
      return tournamentExit;
    },
    [UI_STATUS.ERROR]: () => {
      const tournamentExit = document.createElement('tournament-exit');
      tournamentExit.data = {
        status: UI_STATUS.ERROR,
      };
      return tournamentExit;
    },
  };

  updateContentOnStatusChange() {
    if (this.tournamentContentWrapper.firstChild) {
      this.tournamentContentWrapper.removeChild(this.tournamentContentWrapper.firstChild);
    }
    let content = null;
    devLog('Updating content for UI status:', this.#state.uiStatus);
    content = this.tournamentContent[this.#state.uiStatus]();

    if (content) {
      this.tournamentContentWrapper.appendChild(content);
    } else {
      devErrorLog(`Tournament status not found: ${this.#state.uiStatus}`);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      WebSocket messages handling                                         */
  /* ------------------------------------------------------------------------ */

  /**
   * Called onMessage tournament_start from tournament WS
   * @description Initializes the tournament state and updates the UI.
   */
  handleTournamentStart(data) {
    if (
      data.tournament_id !== this.#state.tournamentId ||
      !this.#state.tournament ||
      this.#state.tournament.status === TOURNAMENT_STATUS.ONGOING
    ) {
      return;
    }
    this.#state.currentRoundNumber = 1;
    this.#state.currentRound = data.round;
    this.#state.remainingBracketsInCurrentRound = data.round.brackets.length;
    this.#state.tournament.status = TOURNAMENT_STATUS.ONGOING;
    this.#state.tournament.rounds[0] = this.#state.currentRound;
    this.findAssignedBracketForUser();
    if (!this.#state.currentUserBracket) {
      devErrorLog('User is not assigned to any bracket in the current round');
      router.redirect('/tournament-menu');
      return;
    }
    this.#state.userDataInTournament.status = PARTICIPANT_STATUS.QUALIFIED;
    this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
    this.updateContentOnStatusChange();
  }

  /**
   * Called onMessage match_result from tournament WS
   * @description Updates the match result in the tournament round ongoing view.
   */
  updateMatchResult(data) {
    if (this.#state.uiStatus !== UI_STATUS.WAITING_NEXT_ROUND) {
      return;
    }
    const tournamentRoundOngoingElement = this.querySelector('tournament-round-ongoing');
    if (!tournamentRoundOngoingElement) {
      devErrorLog('Tournament RoundOngoing Element not found, cannot update bracket.');
      return;
    }
    tournamentRoundOngoingElement.updateBracket(data);
  }

  /**
   * Called onEvent round-finished-ui-ready
   * @description Sets the current round as finished
   * If the next round data is already set, it triggers the start of the next round.
   */
  setCurrentRoundFinished() {
    this.#state.currentRoundFinished = true;
    if (this.#state.nextRound) {
      this.#state.currentRound = this.#state.nextRound;
      this.#state.currentRoundNumber++;
      this.handleRoundStart();
    }
  }

  /**
   * Called onMessage round_start from tournament WS
   * @description Sets the next round data in the state.
   * If the previous round is set as finished, it triggers the start of the next round.
   */
  setNextRound(data) {
    if (!data || data.tournament_id !== this.#state.tournamentId) {
      return;
    }
    this.#state.nextRound = data.round;
    if (this.#state.currentRoundFinished) {
      this.#state.currentRound = this.#state.nextRound;
      this.#state.currentRoundNumber++;
      this.handleRoundStart();
    }
  }

  /**
   * @description Sets the UI status to WAITING_NEXT_ROUND and updates the content.
   */
  handleRoundStart() {
    this.findAssignedBracketForUser();
    this.#state.currentRoundFinished = false;
    this.#state.nextRound = null;
    this.#state.uiStatus = UI_STATUS.ROUND_STARTING;
    this.updateContentOnStatusChange();
  }

  /**
   * Called onMessage tournament_canceled from tournament WS
   * @description Sets the UI status to CANCELED and updates the content.
   */
  handleTournamentCanceled(data) {
    if (data.tournament_id !== this.#state.tournamentId) {
      return;
    }
    socketManager.closeSocket('tournament', this.#state.tournamentId);
    if (!this.#state.creator.username || this.#state.creator.username !== this.#state.user.username) {
      showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.CANCELED, this.#state.tournament.name);
    }
    this.#state.uiStatus = UI_STATUS.CANCELED;
    this.updateContentOnStatusChange();
  }

  /**
   * @description Cancels the tournament on cancel button click by the creator.
   */
  async cancelTournament() {
    if (!this.#state.creator.username || this.#state.creator.username !== this.#state.user.username) {
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
      if (response.status === 429) {
        return;
      }
      showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg);
      return;
    }
    showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Tournament canceled successfully.');
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
