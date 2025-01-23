export class BestEnemy extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		if (this.user.best_enemy) {
			this.innerHTML = `
			<p>Username: ${this.user.best_enemy.username}</p>
			<p>Avatars: ${this.user.best_enemy.avatar}</p>
			<p>Wins: ${this.user.best_enemy.wins}</p>
			<p>Loses: ${this.user.best_enemy.loses}</p>
			<p>Win rate: ${this.user.best_enemy.winrate}</p>
			<p>Elo: ${this.user.best_enemy.elo}</p>
			`;
		} else {
			this.innerHTML = `
			<p>No best enemy yet</p>
			`;
		}
	}
}

customElements.define('best-enemy', BestEnemy);
