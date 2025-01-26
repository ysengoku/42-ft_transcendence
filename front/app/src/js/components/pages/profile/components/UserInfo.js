export class ProfileUserInfo extends HTMLElement {
	constructor() {
		super();
		this._data = {
			username: null,
			join_date: null,
			titre: null
		}

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
		const date = new Date(this._data.join_date);
		const formatedDate = new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
		// const titre = this._data.titre;
		const titre = 'titre';

		this.innerHTML = `
			<div class="d-flex flex-row justify-content-center align-items-center">
				<div class="d-flex flex-column justify-content-center px-3 pt-3">
					<h2>${username}</h2>
					<p>Joined on ${formatedDate}</p>
				</div>
				<div class="text-center px-3 pt-3">
					<p>${titre}</p>
				</div>
			</div>
		`;
	}
}

customElements.define('profile-user-info', ProfileUserInfo);
