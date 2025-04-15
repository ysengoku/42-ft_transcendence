export class ProfileUserInfo extends HTMLElement {
  #state = {
    username: null,
    nickname: null,
    join_date: null,
    title: null,
  };

  constructor() {
    super();
  }

  set data(value) {
    this.#state = value;
    this.render();
  }

  render() {
    const date = new Date(this.#state.join_date);
    this.formatedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

    this.innerHTML = this.template() + this.style();

    this.#state.title = '5000'; // TODO: remove
    this.#state.title = `$${this.#state.title}`;

    this.querySelector('#profile-nickname').textContent = this.#state.nickname;
    this.querySelector('#profile-username').textContent = `@${this.#state.username}`;
    this.querySelector('#profile-title').textContent = this.#state.title;
  }

  template() {
    return `
			<div class="d-flex flex-wrap flex-row justify-content-center align-items-center gap-3">
				<div class="d-flex flex-column justify-content-center px-3 pt-3">
          <div class="d-flex flex-row align-items-center">
					  <h2 class="m-0 text-center pe-3 text-break flex-grow-1" id="profile-nickname"></h2>
            <p class="fs-5 m-0 text-center text-break" id="profile-username"></p>
          </div>
					<p class="m-0 text-center">Joined on ${this.formatedDate}</p>
				</div>
				<h2 class="text-center px-3 pt-3 m-0" id="profile-title"></h2>
			</div>
		`;
  }

  style() {
    return `
    <style>
    h2 {
      font-family: 'van dyke', serif;
      font-size: 2.8em;
    }
    #profile-username {
      min-width: 88px;
    }
    </style>
    `;
  }
}

customElements.define('profile-user-info', ProfileUserInfo);
