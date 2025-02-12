import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
// import { simulateApiLogin } from '@mock/functions/mockLogin.js';
// import { simulateLoginSuccessResponse } from '@mock/functions/mockLogin.js';

export class LoginForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupLoginHandler();
    this.setUpRemoveFeedback();
  }

  render() {
    this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center">
			<form class="w-100" id="loginForm">
  			<div class="d-flex flex-column mb-3 gap-2">
    			<label for="inputUsername" class="form-label">Username or Email</label>
   				<input type="text" class="form-control" id="inputUsername" placeholder="username or email">
          <div class='invalid-feedback' id='username-feedback'></div>
  			</div>
				<div class="mb-3">
					<label for="inputPassword" class="form-label">Password</label>
    			<input type="password" class="form-control" id="inputPassword" placeholder="password">
          <div class='invalid-feedback' id='loginpassword-feedback'></div>
  			</div>
				<div class="mb-2 py-3">
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
    const usernameInput = this.querySelector('#inputUsername').value;
    const username = usernameInput;
    const password = this.querySelector('#inputPassword').value;

    if (!this.checkInputs()) {
      return;
    }

    const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, { username, password }, false, false);
    console.log('Login response:', response);
    if (response.success) {
      if (response.status == 200) {
        const userInformation = {
          username: response.data.username,
          nickname: response.data.nickname,
          avatar: response.data.avatar,
        };
        auth.storeUser(userInformation);
        router.navigate(`/home`, response.user);
      }
    } else {
      const feedback = document.querySelector('#login-failed-feedback');
      feedback.innerHTML = `
        <div class="alert alert-danger alert-dismissible" role="alert">
          ${response.msg}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }

  checkInputs() {
    const usernameField = this.querySelector('#inputUsername');
    const emailField = this.querySelector('#inputEmail');
    const passwordField = this.querySelector('#inputPassword');

    let isValid = true;
    if (!usernameField.value.trim() && !emailField.value.trim()) {
      usernameField.classList.add('is-invalid');
      emailField.classList.add('is-invalid');
      document.querySelector('#username-feedback').textContent = 'Login ID or email is required';
      isValid = false;
    }
    if (!passwordField.value.trim()) {
      passwordField.classList.add('is-invalid');
      document.querySelector('#loginpassword-feedback').textContent = 'Password is required';
      isValid = false;
    }
    return isValid;
  }

  setUpRemoveFeedback() {
    const usernameField = this.querySelector('#inputUsername');
    const passwordField = this.querySelector('#inputPassword');

    usernameField.addEventListener('input', () => {
      usernameField.classList.remove('is-invalid');
      document.querySelector('#username-feedback').textContent = '';
    });
    passwordField.addEventListener('input', () => {
      passwordField.classList.remove('is-invalid');
      document.querySelector('#loginpassword-feedback').textContent = '';
    });
  }
}

customElements.define('login-form', LoginForm);
