import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import './components/index.js';

export class UserProfile extends HTMLElement {
  #state = {
    loggedInUsername: '',
    user: null,
  };

  constructor() {
    super();
    this.user = null;
  }

  setParam(param) {
    const username = param.username;
    this.fetchUserData(username);
  }

  async fetchUserData(username) {
    /* eslint-disable-next-line new-cap */
    const response = await apiRequest('GET', API_ENDPOINTS.USER_PROFILE(username));
    if (response.success) {
      if (response.status === 200) {
        this.user = response.data;
        console.log('User data:', this.user);
        this.render();
      }
    } else {
      if (response.status === 404) {
        router.navigate('/user-not-found');
      } else if (response.status === 401) {
        router.navigate('/login');
      } else {
        router.navigate(`/error?code=${response.status}&error=${response.msg}`);
        console.error('Error ', response.status, ': ', response.msg);
      }
    }
  }

  render() {
    if (this.user.is_blocked_by_user) {
      router.navigate('/user-not-found');
      return;
    }
    const storedUser = sessionStorage.getItem('user');
    this.#state.loggedInUsername = JSON.parse(storedUser).username;

    this.innerHTML = this.style() + this.template();

    this.onlineStatusIndicator = document.createElement('profile-online-status');
    this.onlineStatusIndicator.setAttribute('online', this.user.is_online);
    this.onlineStatusIndicatorField = this.querySelector('#user-profile-online-status');
    this.onlineStatusIndicatorField.innerHTML = this.onlineStatusIndicator.outerHTML;

    const profileAvatar = this.querySelector('profile-avatar');
    if (profileAvatar) {
      profileAvatar.avatarUrl = this.user.avatar;
    }

    const profileUserInfo = this.querySelector('profile-user-info');
    if (profileUserInfo) {
      profileUserInfo.data = {
        username: this.user.username,
        nickname: this.user.nickname,
        join_date: this.user.date_joined,
        titre: this.user.titre,
      };
    }

    const profileUserActions = this.querySelector('profile-user-actions');
    if (profileUserActions) {
      profileUserActions.data = {
        loggedInUsername: this.#state.loggedInUsername,
        shownUsername: this.user.username,
        isFriend: this.user.is_friend,
        isBlocked: this.user.is_blocked_user,
      };
    }

    const userStatCardElo = document.createElement('user-stat-card');
    userStatCardElo.setParam({ title: 'Elo', value: this.user.elo });
    const userStatCardScoredBalls = document.createElement('user-stat-card');
    userStatCardScoredBalls.setParam({ title: 'Scored Balls', value: this.user.scored_balls });
    const userStatCardTotalMatches = document.createElement('user-stat-card');
    userStatCardTotalMatches.setParam({ title: 'Total Matches', value: this.user.total_matches });
    const userStatCardFriendsCount = document.createElement('user-stat-card');
    userStatCardFriendsCount.setParam({ title: 'Friends', value: this.user.friends_count });

    const userStatElo = this.querySelector('#user-stat-card-elo');
    const userStatScoredBalls = this.querySelector('#user-stat-card-scored-balls');
    const userStatTotalMatches = this.querySelector('#user-stat-card-total-matches');
    const userStatFriendsCount = this.querySelector('#user-stat-card-friends-count');
    userStatElo.appendChild(userStatCardElo);
    userStatScoredBalls.appendChild(userStatCardScoredBalls);
    userStatTotalMatches.appendChild(userStatCardTotalMatches);
    userStatFriendsCount.appendChild(userStatCardFriendsCount);

    const userWinRatePieGraph = this.querySelector('user-win-rate-pie-graph');
    if (userWinRatePieGraph) {
      userWinRatePieGraph.data = {
        rate: this.user.winrate,
        wins: this.user.wins,
        losses: this.user.loses,
      };
    }

    // TODO: Elo graph

    const bestEnemyContainer = this.querySelector('#best-enemy');
    const bestEnemy = document.createElement('user-enemy-component');
    bestEnemy.setParam({ type: 'best', data: this.user.best_enemy });
    bestEnemyContainer.appendChild(bestEnemy);
    const worstEnemyContainer = this.querySelector('#worst-enemy');
    const worstEnemy = document.createElement('user-enemy-component');
    worstEnemy.setParam({ type: 'worst', data: this.user.worst_enemy });
    worstEnemyContainer.appendChild(worstEnemy);

    const gameHistory = this.querySelector('user-game-history');
    if (gameHistory) {
      gameHistory.data = {
        matches: this.user.match_history,
        // tournaments: this.user.tournament_history
      };
    }
  }

  template() {
    return `
    <div class="container-fluid">
      <game-result-modal></game-result-modal>
      <div class="row">

        <!-- Container Left -->
        <div class="d-flex col-12 col-lg-6 py-4">
          <div class="poster container d-flex flex-column justify-content-center flex-grow-1 p-3 gap-2">

            <!-- Online indicator & wanted -->
            <div class="mb-3 text-center justify-content-center px-2 pt-3">
              <div class="d-flex flex-row align-items-center">
                <hr class="line flex-grow-1">  
       
                <div id="user-profile-online-status"></div>
                <hr class="line flex-grow-1">
              </div>
              <h1>WANTED</h1>
              <hr class="line">
            </div>
            
            <!-- Avatar & User Info -->
            <profile-avatar></profile-avatar>
            <profile-user-info></profile-user-info>

            <!-- Stats section -->
            <div class="flex-grow-1">
              <profile-user-actions></profile-user-actions>

              <!-- Stat cards -->
              <div class="d-flex flex-row justify-content-around px-3 mt-4 w-100">
                <div id="user-stat-card-elo"></div>
                <div id="user-stat-card-scored-balls"></div>
                <div id="user-stat-card-total-matches"></div>
                <div id="user-stat-card-friends-count"></div>
              </div>

              <!-- Graphs -->
              <div class="graphs-container container d-flex flex-row justify-content-around align-items-top p-3 gap-3">
                <div class="graph-container p-2">
                  <p>Win Rate</p>
                  <user-win-rate-pie-graph></user-win-rate-pie-graph>
                </div>               
                <div class="graph-container flex-grow-1 p-2">
                  <p>Elo progression</p>
                  <canvas id="eloProgressionChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Container Right -->
        <div class="d-flex col-12 col-lg-6 py-4">
          <div class="poster container d-flex flex-column flex-grow-1 p-3 gap-2">

            <!-- Enemies -->
            <div class="d-grid">
              <div class="row no-gutters no-margin mt-4">
                <div class="col-6 d-flex flex-column px-2 pb-1" id="best-enemy"></div>
                <div class="col-6 d-flex flex-column px-2 pb-1" id="worst-enemy"></div>
              </div>
            </div>

            <!-- Game History -->
            <div class="flex-grow-1 d-flex flex-column px-1 mb-2">
              <user-game-history class="flex-grow-1"></user-game-history>
            </div>
          </div>
        </div>

        <svg><defs><filter id="wave">
						<feTurbulence baseFrequency="0.02" numOctaves="8" seed="1"></feTurbulence>
				 	 	<feDisplacementMap in="SourceGraphic" scale="12" />
				</filter></defs></svg>
      </div>
    </div>`;
  }

  style() {
    return `
    <style>
    .poster {
      color: #1F1101;
      background: radial-gradient(circle, rgba(250, 235, 215, 1) 0%, rgba(164, 106, 48, 0.9) 100%);
      filter: sepia(20%) contrast(90%) brightness(95%);
      box-shadow: inset 0 0 40px rgba(24, 15, 1, 0.3);
    }
    .online-status-indicator {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: gray;
      display: inline-block;
    }
    .online-status-indicator.online {
      background-color: green;
    }
    h1 {
      display: inline-block;
      font-family: 'docktrin', serif;
      font-size: 6em;
      margin-bottom: -.8em;
      transform: scale(1.2, 1);
    }
    hr {
      height: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .line {
      border-top: 4px double #594639;
      opacity: 0.8;
    }
    .graph-container {
     background-color:rgba(0, 0, 0, 0.1);
    }
    .enemies-container {
      height: 224px;
    }
    .enemy-container {
      background-color: rgba(0, 0, 0, 0.1);
      corner-radius: 8px;
    }
    .no-margin {
      margin: 0;
    }
    .row.no-gutters > [class*='col-'] {
      padding-right: 0;
      padding-left: 0;
    }
    @media (max-width: 576px) {
      .row {
        margin-right: 0 !important;
        margin-left: 0 !important;
      }
      .container-fluid {
        max-width: 100vw !important;
        padding: 0 !important;
        margin : 0 !important;
      }
      .graphs-container {
        max-width: 100vw !important;
      }
    }
    </style>
  `;
  }
}

customElements.define('user-profile', UserProfile);
