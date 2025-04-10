export class DuelPreview extends HTMLElement {
  #state = {
    data: null,
  };

  constructor() {
    super();
  }

  set data(data) {
    console.log('data', data);
    this.#state.data = data;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.player1 = this.querySelector('#duel-player1');
    this.player2 = this.querySelector('#duel-player2');

    this.player1.innerHTML = this.userProfileTemplate();
    this.player1.querySelector('.player-avatar').src = this.#state.data.player1.avatar;
    this.player1.querySelector('.player-nickname').innerHTML = this.#state.data.player1.nickname;
    this.player1.querySelector('.player-username').innerHTML = `@${this.#state.data.player1.username}`;
    this.player1.querySelector('.player-elo').innerHTML = `Elo: ${this.#state.data.player1.elo}`;

    this.player2.innerHTML = this.userProfileTemplate();
    this.player2.querySelector('.player-avatar').src = this.#state.data.player2.avatar;
    this.player2.querySelector('.player-nickname').innerHTML = this.#state.data.player2.nickname;
    this.player2.querySelector('.player-username').innerHTML = `@${this.#state.data.player2.username}`;
    this.player2.querySelector('.player-elo').innerHTML = `Elo: ${this.#state.data.player2.elo}`;
  }

  template() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center gap-3">
	    <div id="duel-player1"></div>
      <p class="fs-1 fw-bolder">VS</p>
	    <div id="duel-player2"></div>
	  </div>
	`;
  }

  userProfileTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center my-4 p-4" id="duel-player1">
      <img class="player-avatar" alt="palyer" class="img-fluid rounded-circle">
      <p class="player-nickname m-0 mt-1 fs-4 fw-bold"></p>
      <p class="player-username m-0"></p>
      <span class="player-elo badge mt-3 p-2"></span> 
    </div>`;

  }

  style() {
    return `
    <style>
    .player-avatar {
      width: 120px;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 50%;
      background-color: grey;
    }
    .badge {
      background-color: var(--pm-primary-700);
    }
    </style>
	`;
  }
}

customElements.define('duel-preview', DuelPreview);
