export class TournamentMenu extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Tournament Menu</h1>
			<div class="mb-3 pt-5">
				<a class="btn btn-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;
	}
}

customElements.define('tournament-menu', TournamentMenu);
