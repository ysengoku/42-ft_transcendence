export class WorstEnemy extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		if (this.user.worst_enemy) {
			this.innerHTML = `
			<p>Username: ${this.user.worst_enemy.username}</p>
			<p>Avatars: ${this.user.worst_enemy.avatar}</p>
			<p>Wins: ${this.user.worst_enemy.wins}</p>
			<p>Loses: ${this.user.worst_enemy.loses}</p>
			<p>Win rate: ${this.user.worst_enemy.winrate}</p>
			<p>Elo: ${this.user.worst_enemy.elo}</p>
			`;
		} else {
			this.innerHTML = `
			<p>No worst enemy yet</p>
			`;
		}
	}
}

customElements.define('worst-enemy', WorstEnemy);
