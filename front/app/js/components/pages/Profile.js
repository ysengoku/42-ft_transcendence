import { router } from '../../main.js';

export class UserProfile extends HTMLElement {
	constructor() {
		super();
		this.user = null;
	}

	connectedCallback() {
		this.render();
	}

	set userData(user) {
		this.user = user;
		this.render();
	}

	render() {
		// If user is not logged in, redirect to login page
		const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';  // This is temoporay simulation
		if (!isLoggedIn) {
			router.navigate('/login');
			return;
		}

		// Temporary content
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is ${this.user.name}'s Profile</h1>
			<p>ID: ${this.user.id}</p>
			<div class="mb-3 pt-5">
				<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
