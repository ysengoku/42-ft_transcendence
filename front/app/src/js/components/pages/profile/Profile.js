import {apiRequest} from '@api/apiRequest.js';
import {API_ENDPOINTS} from '@api/endpoints.js';
import './components/index.js';
import poster from '/img/sample-background.png?url';

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
      console.log('username:', username);
      const userData = await apiRequest('GET', API_ENDPOINTS.USER_PROFILE(username));

      this.user = userData;
      this.render();
    } catch (error) {
      // Error handling
      if (error.status === 404) {
        // 404 page & message
      } else {
        // Something went wrong page & message
      }
    }
  }

  render() {
    if (!this.user) {
      console.log('User data is not available');
      return;
    }
    console.log('User data:', this.user);

    const friendsCount = this.user.friends.length;

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
      .online-status-indicator.online {
          background-color: green;
      }
      .enemies-container {
        height: 224px;
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
          <div class="poster container-fluid d-flex flex-column flex-grow-1 mx-1 my-3 p-3 gap-2 h-100">

            <!-- Container Top -->
            <div class="flex-grow-1">
              <div class="mb-3 w-100 text-center px-2 pt-3">
                <div class="d-flex flex-row align-items-center">
                  <hr class="line flex-grow-1">  
                  ${onlineStatus.outerHTML}
                  <hr class="line flex-grow-1">
                </div>
                <h1>WANTED</h1>
                <hr class="line">
              </div>
            
              <profile-avatar></profile-avatar>
              <profile-user-info></profile-user-info>
            </div>

            <!-- Container Bottom -->
            <div class="flex-grow-1">
              <profile-user-actions></profile-user-actions>

              <!-- Stats -->
            <div class="d-flex flex-row justify-content-around mt-5">
              <div class="row px-2 w-100">
                <profile-stat-card class="col-3" title="Elo" value="${this.user.elo}"></profile-stat-card>
                <profile-stat-card class="col-3" title="Total score" value="${this.user.scored_balls}"></profile-stat-card>
                <profile-stat-card class="col-3" title="total duels" value="${this.user.total_matches}"></profile-stat-card>  
                <profile-stat-card class="col-3" title="Friends" value="${friendsCount}"></profile-stat-card>
              </div>
            </div>

            <!-- Graphs -->
            <div class="d-flex flex-row justify-content-around align-items-top">
              <div class="row h-100 m-3 p-2">
                <div class="col-md-6">
                  <p>Win Rate</p>
                  <canvas id="winRateChart">

                  </canvas>
                </div>
                <div class="col-md-6">
                  <p>Elo progression</p>
                  <canvas id="eloProgressionChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Container Right -->
        <div class="d-flex col-12 col-md-6">
        <div class="poster container-fluid d-flex flex-column flex-grow-1 mx-1 my-3 p-3 gap-2 h-100">

        <!-- Container Top -->
        <div class="enemies-container d-grid">
          <div class="row no-gutters no-margin py-3 h-100">
            <div class="col-6 d-flex flex-column h-100">
              <p class="ms-3">Best Enemy</p>
              <profile-enemy-component type="best"></profile-enemy-component>
            </div>
            <div class="col-6 d-flex flex-column h-100">
              <p class="ms-3">Worst Enemy</p>
              <profile-enemy-component type="worst"></profile-enemy-component>
            </div>
          </div>
        </div>

        <!-- Container Bottom -->
        <div class="flex-grow-1 d-flex flex-column p-1">
          <p>Match History</p>
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

    const bestEnemyComponent = document.querySelector('profile-enemy-component[type="best"]');
    const worstEnemyComponent = document.querySelector('profile-enemy-component[type="worst"]');
    if (bestEnemyComponent) {
      bestEnemyComponent.data = this.user.best_enemy;
    }
    if (worstEnemyComponent) {
      worstEnemyComponent.data = this.user.worst_enemy;
    }
  }
}

customElements.define('user-profile', UserProfile);
