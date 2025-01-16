import { router } from '../../main.js';
import './Home.js';
import { simulateApiLogin } from '../../mock/mockApiLogin.js';

export class LoginForm extends HTMLElement {
	constructor() {
		super(); 
	}
	
	connectedCallback() {
		this.render();
		this.setupLoginHandler();
	}

	render() {
		const isLoggedIn = localStorage.getItem('isLoggedin') === 'true';  // Temporary solution
		if (isLoggedIn) {
			router.navigate('/home');
		}

		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center">
			<form class="w-100" id="loginForm">
  				<div class="mb-3">
    				<label for="inputUsername" class="form-label">Username</label>
   					<input type="username" class="form-control" id="inputUsername">
  				</div>
				<div class="mb-3">
					<label for="inputPassword" class="form-label">Password</label>
    				<input type="password" class="form-control" id="inputPassword">
  				</div>
				<div class="mb-3 py-3">
					<button type="submit" id="loginSubmit" class="btn btn-primary btn-lg w-100 pt-50">Login</button>
				</div>
				<div class="mb-3">
					<a href="/register" style="text-decoration: none;">Forgot password?</a>
				</div>
				<div class="mb-3 text-center py-3">
      				<div class="d-flex align-items-center">
        				<hr class="flex-grow-1">
        				<span class="mx-2">OR</span>
        				<hr class="flex-grow-1">
      				</div>
				</div>
				<div class="mb-3">
  					<a class="btn btn-link w-100 py-2" style="text-decoration: none;" href="/register" role="button">Not registered yet? <strong>Sign up now</strong></a>
				</div>
				<div class="mb-3">
  					<a class="btn btn-outline-primary w-100 py-2 my-2" onclick="window.location.href='/';">Login with 42</a>
				</div>
			</form>
		</div>
		`;
	}

	setupLoginHandler() {
		const form = this.querySelector('#loginForm');
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			this.handleLogin();
		});
	}

	// This function should be changed after back-end integration
	async handleLogin() {
		const username = this.querySelector('#inputUsername').value;
		const password = this.querySelector('#inputPassword').value;

		// Simulation with mock
		const response = await simulateApiLogin({ username, password });

		if (response.success) {
			// Temporary solution
			localStorage.setItem('isLoggedIn', 'true');
			localStorage.setItem('user', JSON.stringify(response.user));

			const navBar = document.getElementById('navbar-container');
			navBar.innerHTML = '<navbar-component></navbar-component>';
			router.navigate(`/home`, response.user);
		} else {
			alert('Login failed', response.message);
			// Render login-form with red framed ones
		}
	}
}

customElements.define('login-form', LoginForm);
