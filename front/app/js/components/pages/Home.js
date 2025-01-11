import { router } from '../../main.js';

export class Home extends HTMLElement {
	constructor() {
		super();
		this.user = null;
	}

    setParam(param) {
        this.user = param;
        this.render();
    }

	render() {	
		const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';  // This is temoporay simulation
		// If user is not logged in, redirect to login page
		if (!isLoggedIn) {
			router.navigate('/login');
			return;
		}

		if (!this.user) {
			const storedUser = localStorage.getItem('user');
			if (storedUser) {
				this.user = JSON.parse(storedUser);
			}
		}

		// Temporary content
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>Welcome, ${this.user.name}</h1>
			<p>This is futur PONG Home page ("village")</p>
			<p>ID: ${this.user.id}</p>
			<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="#game" role="button">Go to Game</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-home', Home);
