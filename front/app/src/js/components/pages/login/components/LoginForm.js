import { router } from '@router';
import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';
// import { simulateApiLogin } from '@mock/functions/mockApiLogin.js';
import { simulateLoginSuccessResponse } from '@mock/functions/mockLogin.js';

export class LoginForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupLoginHandler();
  }

  render() {
    const isLoggedIn = localStorage.getItem('isLoggedin') === 'true'; // Temporary solution
    if (isLoggedIn) {
      router.navigate('/home');
    }

    this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center">
      <div id="login-failed-feedback"></div>
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

  async handleLogin() {
    const username = this.querySelector('#inputUsername').value;
    const password = this.querySelector('#inputPassword').value;

    // const response = await simulateApiLogin({ username, password });
    try {
      const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, { username, password }, false, false);
      console.log('Login response:', response);
      if (response.status == 200) {
        localStorage.setItem('isLoggedIn', 'true'); // ----- Temporary solution

        // Add username and avatar to localStorage
        // const userInformation = {
        //   username: response.user.username,
        //   avatar: response.user.avatar,
        // };
        // localStorage.setItem('user', JSON.stringify(userInformation));
        // ----- Temporary solution -------------------------------------
        const mockUserData = await simulateLoginSuccessResponse();
        const userInformation = {
          username: mockUserData.user.username,
          avatar: mockUserData.user.avatar,
        };
        localStorage.setItem('user', JSON.stringify(userInformation));
        // --------------------------------------------------------------

        const navBar = document.getElementById('navbar-container');
        navBar.innerHTML = '<navbar-component></navbar-component>';
        // router.navigate(`/home`, response.user);
        router.navigate(`/home`, mockUserData); // ----- Temporary solution
      }
    } catch (error) {
      const feedback = this.querySelector('#login-failed-feedback');
      feedback.innerHTML = `
      <div class="alert alert-danger alert-dismissible" role="alert">
        ${error.response.msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    }
  }
}

customElements.define('login-form', LoginForm);
