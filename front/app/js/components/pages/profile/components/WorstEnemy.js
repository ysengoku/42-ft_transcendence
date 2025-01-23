export class WorstEnemy extends HTMLElement {
	constructor() {
		super();
		this.data = null;
	}

	set data(value) {
		this.data = value;
		this.render();
	}

	get data() {
		return this.data;
	}

	connectedCallback() {
		if (!this.data) {
			this.render();
		}
	}

	render() {
		if (this.data) {
			this.innerHTML = `
			<p>Username: ${this.data.username}</p>
			<p>Avatars: ${this.data.avatar}</p>
			<p>Wins: ${this.data.wins}</p>
			<p>Loses: ${this.data.loses}</p>
			<p>Win rate: ${this.data.winrate}</p>
			<p>Elo: ${this.data.elo}</p>
			`;
		} else {
			this.innerHTML = `
			<p>No worst enemy yet</p>
			`;
		}
	}
}

customElements.define('worst-enemy', WorstEnemy);
