import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import './components/index.js';
// import poster from '/img/sample-background.png?url';

export class UserProfile extends HTMLElement {
  constructor() {
    super();
    this.user = null;
  }

  setParam(param) {
    const username = param.username;
    this.fetchUserData(username);
  }

  async fetchUserData(username) {
    try {
      /* eslint-disable-next-line new-cap */
      const response = await apiRequest('GET', API_ENDPOINTS.USER_PROFILE(username));
      this.user = response.data;
      this.render();
    } catch (error) {
      if (error.status === 404) {
        router.navigate('/user-not-found');
      } else {
        // Something went wrong page & message
      }
    }
  }

  render() {
    const poster = 'https://placehold.jp/c7c4c2/dedede/480x640.png?text=mock%20img'; // mock img
    // if (!this.user) {
    //   console.log('User data is not available');
    //   return;
    // }
    console.log('User data:', this.user);

    const friendsCount = this.user.friends.length;
    // const friendsCount = this.user.friends_count;

    // Online status
    const onlineStatus = document.createElement('profile-online-status');
    onlineStatus.setAttribute('online', this.user.is_online);

    this.innerHTML = `
    <style>
      .poster {
        background-image: url(${poster});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        color: black;
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
      hr {
        height: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .line {
        border-top: 4px double #594639;
        opacity: 1;
      }
      .graph-container {
       background-color:rgba(0, 0,0, 0.1);
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
    </style>

    <div class="container-fluid flex-grow-1 d-grid gap-3 h-100">
      <div class="row h-100 no-gutters">

        <!-- Container Left -->
        <div class="d-flex col-12 col-md-6">
          <div class="poster container-fluid d-flex flex-column justify-content-center flex-grow-1 mx-1 my-3 p-3 gap-2 h-100">

            <!-- Online indicator & wanted -->
            <div class="mb-3 w-100 text-center px-2 pt-3">
              <div class="d-flex flex-row align-items-center">
                <hr class="line flex-grow-1">  
                ${onlineStatus.outerHTML}
                <hr class="line flex-grow-1">
              </div>
              <h1>WANTED</h1>
              <hr class="line">
            </div>
            
            <!-- Avatar & User Info -->
            <profile-avatar></profile-avatar>
            <profile-user-info></profile-user-info>

            <!-- Container Bottom -->
            <div class="flex-grow-1">
              <profile-user-actions></profile-user-actions>

              <!-- Stats -->
              <div class="d-flex flex-row justify-content-around mt-4">
                <div class="row px-2 w-100">
                  <user-stat-card class="col-3" title="Elo" value="${this.user.elo}"></user-stat-card>
                  <user-stat-card class="col-3" title="Total score" value="${this.user.scored_balls}"></user-stat-card>
                  <user-stat-card class="col-3" title="total duels" value="${this.user.total_matches}"></user-stat-card>  
                  <user-stat-card class="col-3" title="Friends" value="${friendsCount}"></user-stat-card>
                </div>
              </div>

              <!-- Graphs -->
              <div class="d-flex flex-row justify-content-around align-items-top px-2 py-3">
                <div class="graph-container me-2 px-4 py-2">
                  <p>Win Rate</p>
                  <user-win-rate-pie-graph></user-win-rate-pie-graph>
                </div>               
                <div class="graph-container flex-grow-1 ms-1 px-4 py-2">
                  <p>Elo progression</p>
                    <canvas id="eloProgressionChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Container Right -->
        <div class="d-flex col-12 col-md-6">
          <div class="poster container-fluid d-flex flex-column flex-grow-1 mx-1 my-3 p-3 gap-2 h-100">

            <!-- Enemies -->
            <div class="d-grid">
              <div class="row no-gutters no-margin mt-4">
                <div class="col-6 d-flex flex-column px-2 pb-1">              
                  <user-enemy-component type="best"></user-enemy-component>
                </div>
                <div class="col-6 d-flex flex-column px-2 pb-1">
                  <user-enemy-component type="worst"></user-enemy-component>
                </div>
              </div>
            </div>

            <!-- Game History -->
            <div class="flex-grow-1 d-flex flex-column px-1 mb-2">
              <user-game-history class="flex-grow-1"></user-game-history>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    const profileAvatar = this.querySelector('profile-avatar');
    if (profileAvatar) {
      profileAvatar.avatarUrl = this.user.avatar;
    }

    const profileUserInfo = this.querySelector('profile-user-info');
    if (profileUserInfo) {
      profileUserInfo.data = {
        username: this.user.username,
        join_date: this.user.date_joined,
        titre: this.user.titre,
      };
    }

    const profileUserActions = this.querySelector('profile-user-actions');
    if (profileUserActions) {
      profileUserActions.data = {
        username: this.user.username,
        friends: this.user.friends,
      };
    }

    const userWinRatePieGraph = this.querySelector('user-win-rate-pie-graph');
    if (userWinRatePieGraph) {
      userWinRatePieGraph.data = {
        rate: this.user.winrate,
        wins: this.user.wins,
        losses: this.user.loses,
      };
    }

    const bestEnemyComponent = document.querySelector('user-enemy-component[type="best"]');
    const worstEnemyComponent = document.querySelector('user-enemy-component[type="worst"]');
    if (bestEnemyComponent) {
      bestEnemyComponent.data = this.user.best_enemy;
    }
    if (worstEnemyComponent) {
      worstEnemyComponent.data = this.user.worst_enemy;
    }

    const gameHistory = this.querySelector('user-game-history');
    if (gameHistory) {
      gameHistory.data = {
        matches: this.user.match_history,
        // tournaments: = this.user.tournament_history
      };
    }
  }
}

customElements.define('user-profile', UserProfile);
