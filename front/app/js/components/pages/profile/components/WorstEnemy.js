export class WorstEnemy extends HTMLElement {
	constructor() {
		super();
		this._data = null;
	}

	set data(value) {
		this._data = value;
		this.render();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		if (this._data) {
			this.innerHTML = `
			<p>Username: ${this._data.username}</p>
			<p>Avatars: ${this._data.avatar}</p>
			<p>Wins: ${this._data.wins}</p>
			<p>Loses: ${this._data.loses}</p>
			<p>Win rate: ${this._data.winrate}</p>
			<p>Elo: ${this._data.elo}</p>
			`;
		} else {
			this.innerHTML = `
			<p>No worst enemy yet</p>
			`;
		}
	}
}

customElements.define('worst-enemy', WorstEnemy);
