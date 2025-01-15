import { router } from '../../main.js';

export class Home extends HTMLElement {
	constructor() {
		super();
		this.user = null;
	}

	connectedCallback() {
		this.render();
	}

	render() {	
		const storedUser = localStorage.getItem('user');
		if (!storedUser) {
			console.error('Missing user information.');
			router.navigate('/login');
		}
		this.user = JSON.parse(storedUser);

		// Temporary content
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>Welcome, ${this.user.name}</h1>
			<p>This is futur Home page ("hub?")</p>
			<p>ID: ${this.user.userid}</p>
			<div class="d-flex flex-column justify-content-center align-items-center grid gap-4 row-gap-4">
				<a class="btn btn-primary btn-lg" href="/dual-menu" role="button">Dual</a>
				<a class="btn btn-primary btn-lg" href="/tournament-menu" role="button">Tournament</a>
				<div class="btn-group d-flex justify-content-center grid gap-4">
					<a class="btn btn-outline-primary" href="/profile/${this.user.userid}" role="button">Profile</a>
					<a class="btn btn-outline-primary" href="/setting/${this.user.userid}" role="button">Setting</a>
				</div>
			</div>
		</div>
		`;
	}
}

customElements.define('user-home', Home);
