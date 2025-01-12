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
			<p>ID: ${this.user.id}</p>
			<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-home', Home);
