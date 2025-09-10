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
import { showAlertMessageForDuration, ALERT_TYPE, sessionExpiredToast, isEqual } from '@utils';
import { UI_STATUS, TOURNAMENT_STATUS, ROUND_STATUS, BRACKET_STATUS, PARTICIPANT_STATUS } from './tournamentStatus';
import { showTournamentAlert, TOURNAMENT_ALERT_TYPE } from '@components/pages/tournament/utils/tournamentAlert';

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
      alias: 'anonymous gunslinger',
    },
    userDataInTournament: null,
    currentRoundNumber: 0,
    currentRound: null,
    currentUserBracket: null,
    currentRoundFinished: false,
    nextRound: null,
    loading: false,
  };

  #pollingIntervalForNextRound = null;

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
      if (authStatus.status === 429) {
        return;
      }
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
    if (
      this.#state.tournament &&
      (this.#state.tournament.status === TOURNAMENT_STATUS.PENDING ||
        this.#state.tournament.status === TOURNAMENT_STATUS.ONGOING)
    ) {
      socketManager.openSocket('tournament', this.#state.tournamentId);
    }
  }

  disconnectedCallback() {
    document.removeEventListener('round-finished-ui-ready', this.setCurrentRoundFinished);
    this.stopRoundProgressPolling();
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
    if (this.#state.loading) {
      return;
    }
    this.#state.loading = true;
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
      this.#state.loading = false;
      return;
    }
    if (this.#state.tournament && isEqual(this.#state.tournament, response.data)) {
      this.#state.loading = false;
      return;
    }
    this.#state.tournament = response.data;
    if (this.#state.tournament.tournament_creator) {
      this.#state.creator.username = this.#state.tournament.tournament_creator.profile.username;
      this.#state.creator.alias = this.#state.tournament.tournament_creator.alias;
    }

    this.#state.userDataInTournament = this.#state.tournament.participants.find((participant) => {
      return participant.profile.username.toLowerCase() === this.#state.user.username.toLowerCase();
    });
    log.info('User data in tournament:', this.#state.userDataInTournament);
    if (!this.#state.userDataInTournament) {
      log.info('User is not in this tournament');
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

    log.info('Tournament status:', this.#state.tournament.status);
    switch (this.#state.tournament.status) {
      case TOURNAMENT_STATUS.FINISHED:
        this.innerHTML = '';
        if (this.#state.userDataInTournament.status === PARTICIPANT_STATUS.WINNER) {
          log.info('Tournament finished and the user is the champion');
          socketManager.closeSocket('tournament', this.#state.tournamentId);
          requestAnimationFrame(() => {
            showTournamentAlert(this.#state.tournamentId, TOURNAMENT_ALERT_TYPE.CHAMPION, this.#state.tournament.name);
          });
          setTimeout(() => {
            router.redirect(`/tournament-overview/${this.#state.tournamentId}`);
          }, 7000);
        } else {
          router.redirect('/home');
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
      case TOURNAMENT_STATUS.ONGOING:
        this.findCurrentRound();
        this.#state.currentRound = this.#state.tournament.rounds[this.#state.currentRoundNumber - 1];
        this.findAssignedBracketForUser();
        log.info("Current user's bracket", this.#state.currentUserBracket);
        if (!this.#state.currentUserBracket) {
          log.info('User is not assigned to any bracket in the current round. Start polling to check assignment.');
          return;
        }
        this.resolveUIStatus[this.#state.tournament.status]();
        const isUserQualified = this.checkUserStatus();
        if (!isUserQualified) {
          return;
        }
        this.startRoundProgressPolling();
        break;
      default:
        log.error('Unknown tournament status:', this.#state.tournament.status);
    }

    log.info('UI status set to:', this.#state.uiStatus);
    this.render();
    this.#state.loading = false;
  }

  findCurrentRound() {
    this.#state.currentRound = this.#state.tournament.rounds.find((round) => {
      return round.status === ROUND_STATUS.ONGOING || round.status === ROUND_STATUS.PENDING;
    });
    if (!this.#state.currentRound) {
      log.error('No ongoing or pending round found in the tournament');
      return;
    }
    this.#state.currentRoundNumber = this.#state.tournament.rounds.indexOf(this.#state.currentRound) + 1;
    log.info('Current round found:', this.#state.currentRound);
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
    switch (this.#state.userDataInTournament.status) {
      case PARTICIPANT_STATUS.PLAYING:
        const gameId = this.#state.currentUserBracket.game_id;
        const userAlias = this.#state.userDataInTournament.alias;
        const opponentAlias =
          this.#state.currentUserBracket.participant1.alias === userAlias
            ? this.#state.currentUserBracket.participant2.alias
            : this.#state.currentUserBracket.participant1.alias;
        const queryParams = new URLSearchParams({
          userPlayerName: userAlias,
          opponentPlayerName: opponentAlias,
        }).toString();
        router.redirect(`multiplayer-game/${gameId}?${queryParams}`);
        log.info('User is playing a match, redirecting to game page:', gameId);
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
        log.error('Unknown participant status');
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
              this.#state.uiStatus = UI_STATUS.ERROR;
              break;
            default:
              log.error('Unknown bracket status:', this.#state.currentUserBracket.status);
          }
          break;
        default:
          log.error(
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
        userAlias: this.#state.userDataInTournament.alias,
        opponentAlias:
          this.#state.currentUserBracket.participant1.alias === this.#state.userDataInTournament.alias
            ? this.#state.currentUserBracket.participant2.alias
            : this.#state.currentUserBracket.participant1.alias,
      };
      log.info("User's Game id for the starting round:", this.#state.currentUserBracket.game_id);
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
        userAlias: this.#state.userDataInTournament.alias,
        opponentAlias:
          this.#state.currentUserBracket.participant1.alias === this.#state.userDataInTournament.alias
            ? this.#state.currentUserBracket.participant2.alias
            : this.#state.currentUserBracket.participant1.alias,
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
    log.info('Updating content for UI status:', this.#state.uiStatus);
    content = this.tournamentContent[this.#state.uiStatus]();

    if (content) {
      this.tournamentContentWrapper.appendChild(content);
    } else {
      log.error(`Tournament status not found: ${this.#state.uiStatus}`);
    }
  }

  startRoundProgressPolling() {
    this.stopRoundProgressPolling();
    if (
      this.#state.tournament.status !== TOURNAMENT_STATUS.ONGOING ||
      this.#state.uiStatus !== UI_STATUS.WAITING_NEXT_ROUND
    ) {
      return;
    }
    this.#pollingIntervalForNextRound = setInterval(async () => {
      await this.fetchTournamentData();
      if (this.#state.uiStatus !== UI_STATUS.WAITING_NEXT_ROUND) {
        this.stopRoundProgressPolling();
      }
    }, 15000);
  }

  stopRoundProgressPolling() {
    if (this.#pollingIntervalForNextRound) {
      clearInterval(this.#pollingIntervalForNextRound);
      this.#pollingIntervalForNextRound = null;
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
      log.error('User is not assigned to any bracket in the current round');
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
      log.error('Tournament RoundOngoing Element not found, cannot update bracket.');
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

// "rounds": [
//     {
//         "number": 1,
//         "brackets": [
//             {
//                 "game_id": "347c0d95-5752-43b4-8c89-c81a3d405d5c",
//                 "participant1": {
//                     "profile": {
//                         "username": "menaco",
//                     "status": "qualified"
//                 },
//                 "participant2": {
//                     "profile": {
//                         "username": "Rex",
//                     "status": "eliminated"
//                 },
//                 "winner": {
//                     "profile": {
//                         "username": "menaco",
//                     "status": "qualified"
//                 },
//                 "status": "cancelled",
//             },
//             {
//                 "game_id": "d48a5944-55ef-4408-b952-c84377ed53fc",
//                 "participant1": {
//                     "profile": {
//                         "username": "Pedro",
//                     "status": "qualified"
//                 },
//                 "participant2": {
//                     "profile": {
//                         "username": "Tama",
//                     "status": "eliminated"
//                 },
//                 "winner": {
//                     "profile": {
//                         "username": "Pedro",
//                     "status": "qualified"
//                 },
//                 "status": "finished",
//             }
//         ],
//         "status": "finished"
//     },
//     {
//         "number": 2,
//         "brackets": [],
//         "status": "pending"
//     },
//     {
//         "number": 3,
//         "brackets": [],
//         "status": "pending"
//     }
// ],
// "participants": [
//     {
//         "profile": {
//             "username": "menaco",
//             "nickname": "PrettyFrog",
//             "avatar": "/media/avatars/menaco.jpg",
//             "elo": 1579,
//             "is_online": false
//         },
//         "alias": "NightHawk",
//         "status": "qualified"
//     },
//     {
//         "profile": {
//             "username": "Rex",
//             "nickname": "Good_boy",
//             "avatar": "/media/avatars/rex.jpg",
//             "elo": 2300,
//             "is_online": false
//         },
//         "alias": "SilverWolf",
//         "status": "eliminated"
//     },
//     {
//         "profile": {
//             "username": "Tama",
//             "nickname": "flower_girl",
//             "avatar": "/media/avatars/tama.jpg",
//             "elo": 2877,
//             "is_online": false
//         },
//         "alias": "flower_girl",
//         "status": "eliminated"
//     },
//     {
//         "profile": {
//             "username": "Pedro",
//             "nickname": "The_original",
//             "avatar": "/media/avatars/pedro.jpg",
//             "elo": 147,
//             "is_online": true
//         },
//         "alias": "The_original",
//         "status": "qualified"
//     }
// ],
// "status": "ongoing",
// "required_participants": 4,
// "date": "2025-09-09T18:14:49.859Z",
// "participants_count": 4,
// "settings": {
//     "game_speed": "medium",
//     "score_to_win": 3,
//     "time_limit": 1,
//     "ranked": false,
//     "cool_mode": true
// },
// "winner": null
