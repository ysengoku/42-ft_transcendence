export class ProfileUserInfo extends HTMLElement {
  #state = {
    username: null,
    nickname: null,
    join_date: null,
    titre: null,
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

    // Temporay
    this.#state.titre = '$5000';

    this.querySelector('#profile-nickname').textContent = this.#state.nickname;
    this.querySelector('#profile-username').textContent = `@${this.#state.username}`;
    this.querySelector('#profile-titre').textContent = this.#state.titre;
  }

  template() {
    return `
			<div class="d-flex flex-row justify-content-center align-items-center gap-3">
				<div class="d-flex flex-column justify-content-center px-3 pt-3">
          <div class="d-flex flex-row align-items-center">
					  <h2 class="m-0 pe-3" id="profile-nickname"></h2>
            <p class="m-0 pt-1" id="profile-username"></p>
          </div>
					<p class="m-0 text-center">Joined on ${this.formatedDate}</p>
				</div>
				<div class="text-center px-3 pt-3">
					<h2 class="m-0" id="profile-titre"></h2>
				</div>
			</div>
		`;
  }

  style() {
    return `
    <style>
      h2 {
        font-family: 'van dyke', serif;
        color: #351904;
      }
    </style>
    `;
  }
}

customElements.define('profile-user-info', ProfileUserInfo);
