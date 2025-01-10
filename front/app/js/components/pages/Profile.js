export class UserProfile extends HTMLElement {
	constructor() {
		super();
		// this.user = null;
	}

	connectedCallback() {
		this.render();
	}

	// set user(userData) {
	// 	this.user = userData;
	// 	this.render();
	// }

	render() {
		// If user is not logged in, redirect to login page

		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Profile page</h1>

			<div class="mb-3 pt-5">
				<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
