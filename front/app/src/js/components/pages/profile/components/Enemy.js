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
    this.innerHTML = this.template() + this.style();

    if (!this.#state.data) {
      return;
    }

    const nickname = this.querySelector('.enemy-nickname');
    nickname.textContent = this.#state.data.nickname;
    const avatar = this.querySelector('.enemy-avatar');
    avatar.src = this.#state.data.avatar;
    const elo = this.querySelector('.enemy-elo');
    elo.textContent = this.#state.data.elo;
    const winrate = this.querySelector('.enemy-winrate');
    winrate.textContent = this.#state.data.winrate;
    const wins = this.querySelector('.wins');
    wins.textContent = `wins ${this.#state.data.wins}`;
    const losses = this.querySelector('.losses');
    losses.textContent = `losses ${this.#state.data.loses}`;

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
      <div class="enemy-container d-flex flex-column justify-content-start p-2">
			  <p class="stat-label text-center">${type}</p>
			  <div class="enemy-avatar-container">
				  <p class="enemy-nickname lh-1 text-center text-break fw-bold fs-4 p-2 m-0"></p>
				  <div class="d-flex flex-row justify-content-center align-items-start px-2 pt-1 pb-3 gap-4">
					  <div class="d-flex flex-column justify-content-start px-2">
					  <img alt="User Avatar" class="enemy-avatar avatar-l rounded-circle">
					  </div>
					  <div>
						  <div class="d-flex m-0 fs-5">Elo:&nbsp;<p class="enemy-elo m-0"></p></div>
						  <div class="d-flex m-0 fs-5">Win rate:&nbsp;<p class="enemy-winrate m-0"></p></div>
						  <p class="wins m-0 fs-6"</p>
						  <p class="losses m-0 fs-6"</p>
					  </div>
				  </div>
			  </div>
      </div>
			`;
    } else {
      return `
      <div class="enemy-container d-flex flex-column justify-content-start p-2">
			  <p class="m-0 ms-1 text-center">${type}</p>
			  <div class="enemy-avatar-container d-flex flex-column justify-content-center text-center mt-3 p-2">
				  <p>No ${type.toLowerCase()}</p>
			  </div>
      </div>
      `;
    }
  }

  style() {
    return `
    <style>
		.enemy-container {
			min-width: 240px;
		}
    </style>
    `;
  }
}

customElements.define('user-enemy-component', UserEnemy);
