import { router } from '@router';
import '../home/Home.js';
import { LoginForm } from './components/LoginForm.js';
import { OAuth } from './components/OAuth.js';
// import { simulateApiLogin } from '@mock/functions/mockApiLogin.js';

export class Login extends HTMLElement {
	constructor() {
		super(); 
	}
	
	connectedCallback() {
		this.render();
		// this.setupLoginHandler();
	}

	render() {
		const isLoggedIn = localStorage.getItem('isLoggedin') === 'true';  // Temporary solution
		if (isLoggedIn) {
			router.navigate('/home');
		}

		this.innerHTML = `
		<div>
			<login-form></login-form>
			<div class="container d-flex flex-column justify-content-center align-items-center ">
				<div class="mb-3 w-100">
					<a href="/register" style="text-decoration: none;">Forgot password?</a>
				</div>
				<div class="mb-3 w-100 text-center py-3">
      				<div class="d-flex align-items-center">
        				<hr class="flex-grow-1">
        				<span class="mx-2">OR</span>
        				<hr class="flex-grow-1">
      				</div>
				</div>
				<div class="mb-3 w-100">
  					<a class="btn btn-link w-100 py-2" style="text-decoration: none;" href="/register" role="button">Not registered yet? <strong>Sign up now</strong></a>
				</div>
			</div>
			<oauth-component></oauth-component>
		</div>
		`;
	}

// 	setupLoginHandler() {
// 		const form = this.querySelector('#loginForm');
// 		form.addEventListener('submit', (event) => {
// 			event.preventDefault();
// 			this.handleLogin();
// 		});
// 	}

// 	// This function should be changed after back-end integration
// 	async handleLogin() {
// 		const username = this.querySelector('#inputUsername').value;
// 		const password = this.querySelector('#inputPassword').value;

// 		// Simulation with mock
// 		const response = await simulateApiLogin({ username, password });

// 		if (response.success) {
// 			// Temporary solution
// 			localStorage.setItem('isLoggedIn', 'true');
// 			localStorage.setItem('user', JSON.stringify(response.user));

// 			const navBar = document.getElementById('navbar-container');
// 			navBar.innerHTML = '<navbar-component></navbar-component>';
// 			router.navigate(`/home`, response.user);
// 		} else {
// 			alert('Login failed', response.message);
// 			// Render login-form with red framed ones
// 		}
// 	}
}

customElements.define('login-view', Login);
