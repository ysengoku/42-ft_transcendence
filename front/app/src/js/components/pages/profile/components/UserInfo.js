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
    this.#state.titre = 'Titre';

    this.querySelector('#profile-nickname').textContent = this.#state.nickname;
    this.querySelector('#profile-username').textContent = `@${this.#state.username}`;
    this.querySelector('#profile-titre').textContent = this.#state.titre;
  }
    
    template() {
      return `
			<div class="d-flex flex-row justify-content-center align-items-center gap-3">
				<div class="d-flex flex-column justify-content-center px-3 pt-3">
          <div class="d-flex flex-row align-items-center">
					  <h2 class="no-margin pe-3" id="profile-nickname"></h2>
            <p class="no-margin pt-2" id="profile-username"></p>
          </div>
					<p class="no-margin">Joined on ${this.formatedDate}</p>
				</div>
				<div class="text-center px-3 pt-3">
					<p id="profile-titre"></p>
				</div>
			</div>
		`;
  }

  style() {
    return `
    <style>
      h2 {
        font-family: 'Texas Tango Extra Roth', serif;
        color: #1F1101;
      }
    </style>
    `;
    }
}

customElements.define('profile-user-info', ProfileUserInfo);
