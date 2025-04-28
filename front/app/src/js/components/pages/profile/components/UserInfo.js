import { formatDateMDY } from '@utils';

export class ProfileUserInfo extends HTMLElement {
  #state = {
    username: null,
    nickname: null,
    join_date: null,
    title: null,
    price: null,
  };

  constructor() {
    super();
  }

  set data(value) {
    this.#state = value;
    this.render();
  }

  render() {
    this.formatedDate = formatDateMDY(this.#state.join_date);
    this.innerHTML = this.template() + this.style();

    this.querySelector('#profile-nickname').textContent = this.#state.nickname;
    this.querySelector('#profile-username').textContent = `@${this.#state.username}`;
    this.querySelector('#profile-title').textContent = this.#state.title;
    this.querySelector('#profile-price').textContent = `$${this.#state.price}`;
  }

  template() {
    return `
			<div class="d-flex flex-wrap flex-row justify-content-center align-items-center gap-3">
				<div class="d-flex flex-column justify-content-center px-3 pt-2">
          <div class="d-flex flex-row align-items-center">
					  <p class="m-0 text-center pe-3 fs-1 text-break flex-grow-1" id="profile-nickname"></p>
            <p class="fs-5 m-0 text-center text-break" id="profile-username"></p>
          </div>
					<p class="m-0 text-center fw-bold">Joined on ${this.formatedDate}</p>
				</div>
        <div class="d-flex flex-column justify-content-center px-3 pt-3">
          <p class="text-center m-0 fs-1" id="profile-price"></p>
				  <p class="text-center fs-5 m-0" id="profile-title"></p>
        </div>
			</div>
		`;
  }

  style() {
    return `
    <style>
    #profile-nickname,
    #profile-title,
    #profile-price {
      font-family: 'van dyke', serif;
    }
    #profile-username {
      min-width: 88px;
    }
    #profile-price {
      margin-bottom: -8px !important;
    }
    </style>
    `;
  }
}

customElements.define('profile-user-info', ProfileUserInfo);
