import { auth } from '@auth';
import './components/index.js';
import { mockDuelData } from '@mock/functions/mockDuelData';

export class DuelResult extends HTMLElement {
  // TODO
  #state = {
    gameId: '',
    loggedInUser: null,
    duelData: null,
    // date
    // winner (username, nickname, avatar, elo)
    // looser (username, nickname, avatar, elo)
    // score
  };

  setParam(param) {
    if (!param.id) {
      const notFound = document.createElement('page-not-found');
      this.innerHTML = '';
      this.appendChild(notFound);
      return;
    }
    this.#state.gameId = param.id;

    // TODO
    // fetch loggedInUser
    // fetch duel data
    this.#state.loggedInUser = auth.getStoredUser();

    this.#state.duelData = mockDuelData('finished');
    if (this.#state.duelData.status !== 'finished') {
      // TODO: Show some messages
    }
    console.log('Duel data:', this.#state.duelData);
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.winner = this.querySelector('#duel-winner');
    this.loser = this.querySelector('#duel-loser');
    this.goToHomeButton = this.querySelector('#go-to-home-button');
    this.goToProfileButton = this.querySelector('#go-to-profile-button');

    this.renderUserResult(true);
    this.renderUserResult(false);
  }

  renderUserResult(winner = true) {
    let userWrapper = null;
    let userData = null;
    let score = 0;
    winner ? (
      userWrapper =this.winner,
      userData = this.#state.duelData.winner,
      score = this.#state.duelData.winner_score
    ) : (
      userWrapper = this.loser,
      userData = this.#state.duelData.loser,
      score = this.#state.duelData.looser_score
    );
    console.log('User data:', userData);
    userWrapper.innerHTML = this.userTemplate();
    userWrapper.querySelector('.duel-score').innerHTML = score;
    userWrapper.querySelector('.avatar-l').src = userData.avatar;
    userWrapper.querySelector('.player-nickname').innerHTML = userData.nickname;
    userWrapper.querySelector('.player-username').innerHTML = `@${userData.username}`;
    userWrapper.querySelector('.player-elo').innerHTML = `Elo: ${userData.elo}`;
  }

  navigateToHome() {
    router.navigate('/home');
  }

  navigateToProfile() {
    router.navigate(`/profile/${this.#state.loggedInUser.username}`);
  }

  template() {
    // TODO: Adjudt for mobile
    return `
    <div class="row justify-content-center m-2">
      <div class="form-container col-12 col-sm-12 col-md-10 col-lg-8 d-flex flex-column justify-content-center align-items-center p-5">
        <p class="fs-4 my-2">The duel is over. The winner is...</p>
        <div class="d-flex flex-row flex-wrap justify-content-around align-items-center px-4 my-4 w-100" id="duel-content">
          <div class="mb-3" id="duel-winner">winner</div>
          <div class="vs m-3">vs</div>
          <div class="mb-3" id="duel-loser">loser</div>
        </div>
        <div class="d-flex flex-row justify-content-center mt-5 gap-4">
          <button class="btn btn-wood" id="go-to-home-button">Go to Home</button>
          <button class="btn btn-wood" id="go-to-profile-button">See my profile</button>
        </div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .duel-score {
      font-size: 8rem;
    }
    .vs {
      font-size: 4rem;
      font-family: 'van dyke', serif;
      color: rgba(var(--bs-body-color-rgb), 0.6);
    }
    .badge {
      background-color: var(--pm-primary-600);
    }
    </style>
    `;
  }

  userTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center">
      <div class="duel-score"></div>
      <div class="d-flex flex-row justify-content-center align-items-center gap-3">
        <img class="avatar-l rounded-circle" />
        <div class="d-flex flex-column justify-content-center align-items-start">
          <div class="player-nickname fs-3 m-0"></div>
          <div class="player-username"></div>
          <div class="player-elo badge mt-2"></div>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('duel-result', DuelResult);
