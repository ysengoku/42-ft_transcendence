export class ProfileUserInfo extends HTMLElement {
  constructor() {
    super();
    this._data = {
      username: null,
      nickname: null,
      join_date: null,
      titre: null,
    };
  }

  set data(value) {
    this._data = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const username = this._data.username;
    const nickname = this._data.nickname;
    const date = new Date(this._data.join_date);
    const formatedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
    // const titre = this._data.titre;
    const titre = 'titre';

    this.innerHTML = `
			<div class="d-flex flex-row justify-content-center align-items-center  gap-3">
				<div class="d-flex flex-column justify-content-center px-3 pt-3">
          <div class="d-flex flex-row align-items-center">
					  <h2 class="no-margin pe-3">${nickname}</h2>
            <p class="no-margin pt-2">@${username}</p>
          </div>
					<p class="no-margin">Joined on ${formatedDate}</p>
				</div>
				<div class="text-center px-3 pt-3">
					<p>${titre}</p>
				</div>
			</div>
		`;
  }
}

customElements.define('profile-user-info', ProfileUserInfo);
