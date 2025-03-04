import { router } from '@router';

export class UserEnemy extends HTMLElement {
  #state = {
    data: null,
    type: null,
  };

  constructor() {
    super();
  }

  setParam(param) {
    this.#state.type = param.type;
    this.#state.data = param.data;
    this.render();
  }

  disconnectedCallback() {
    if (this.#state.data) {
      this.enemyContainer.removeEventListener('click', this.handleClick);
    }
  }

  render() {
    // Test data ---------------------------------------
    if (this.#state.type === 'best') {
      this.#state.data = {
        username: 'george',
        nickname: 'George',
        avatar: '/__mock__/img/sample-pic3.png',
        wins: 20,
        loses: 10,
        winrate: 67,
        elo: 1100,
      };
    }
    // if (this.#state.type === 'worst') {
    //   this.#state.data = {
    //     nickname: 'Lalala',
    //     avatar: '/__mock__/img/sample-pic2.png',
    //     wins: 20,
    //     loses: 10,
    //     winrate: 67,
    //     elo: 1100,
    //   };
    // }
    // -------------------------------------------------
    this.innerHTML = this.template() + this.style();

    if (!this.#state.data) {
      return;
    }

    const nickname = this.querySelector('.enemy-nickname');
    nickname.textContent = this.#state.data.nickname;
    const avatar = this.querySelector('.enemy-avatar');
    avatar.src = this.#state.data.avatar;
    const elo = this.querySelector('.enemy-elo');
    elo.textContent = `Elo: ${this.#state.data.elo}`;
    const winrate = this.querySelector('.enemy-winrate');
    winrate.textContent = `Win rate: ${this.#state.data.winrate}`;
    const winAndLosses = this.querySelector('.win-and-losses');
    winAndLosses.textContent = `win ${this.#state.data.wins} - losses ${this.#state.data.loses}`;

    this.enemyContainer = this.querySelector('.enemy-container');
    this.handleClick = () => {
      router.navigate(`/profile/${this.#state.data.username}`);
    };
    this.enemyContainer.addEventListener('click', this.handleClick);
  }

  template() {
    const type = this.#state.type === 'best' ? 'Best Enemy' : 'Worst Enemy';
    if (this.#state.data) {
      return `
      <div class="d-flex flex-column justify-content-start enemy-container py-2">
			  <p class="no-margin ms-1 text-center">${type}</p>
			  <div class="enemy-avatar-container">
				  <p class="enemy-nickname lh-1 fs-5 ps-4 py-2 no-margin"></p>
				  <div class="d-flex flex-row justify-content-around align-items-start p-1">
					  <div class="d-flex flex-column justify-content-start px-2">
					  <img alt="User Avatar" class="enemy-avatar rounded-circle">
					  </div>
					  <div>
						  <p class="enemy-elo no-margin fs-6"></p>
						  <p class="enemy-winrate no-margin fs-6"></p>
						  <small class="win-and-losses"</small>
					  </div>
				  </div>
			  </div>
      </div>
			`;
    } else {
      return `
      <div class="d-flex flex-column justify-content-start enemy-container py-2">
			  <p class="no-margin ms-1 text-center">${type}</p>
			  <div class="enemy-avatar-container d-flex flex-column justify-content-center text-center p-2">
				  <p>No ${type.toLowerCase()}</p>
			  </div>
      </div>
      `;
    }
  }

  style() {
    if (this.#state.data) {
      return `
      <style>
				.enemy-avatar-container {
					height: 144px;
				}	
				.enemy-avatar-container img {
    				width: 88px;
    				aspect-ratio: 1;
    				object-fit: cover;
				}
		  </style>
      `;
    } else {
      return '';
    }
  }
}

customElements.define('user-enemy-component', UserEnemy);
