import { router } from '@router';
import { auth } from '@auth/authManager.js';
import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';
// import { simulateApiLogin } from '@mock/functions/mockLogin.js';
// import { simulateLoginSuccessResponse } from '@mock/functions/mockLogin.js';

export class LoginForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupLoginHandler();
    this.setupInputToggle();
    this.setUpRemoveFeedback();
  }

  render() {
    this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center">
      <div id="login-failed-feedback"></div>
			<form class="w-100" id="loginForm">
  				<div class="d-flex flex-column mb-3 gap-2">
    				<label for="inputUsername" class="form-label">Username or Email</label>
   					<input type="text" class="form-control" id="inputUsername" placeholder="username">
   					<input type="text" class="form-control" id="inputEmail" placeholder="email">
            <div class='invalid-feedback' id='loginid-feedback'></div>
  				</div>
				  <div class="mb-2">
					  <label for="inputPassword" class="form-label">Password</label>
    				<input type="password" class="form-control" id="inputPassword" placeholder="Password">
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

  // TODO: Add email case handling
  async handleLogin() {
    const username = this.querySelector('#inputUsername').value;
    // const email = this.querySelector('#inputEmail').value;
    const password = this.querySelector('#inputPassword').value;

    if (!this.checkInputs()) {
      return;
    }

    // TODO: Adjust for API update
    try {
      const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, { username, password }, false, false);
      // ----- Temporary solution -------------------------------------
      // const credentials = {
      //   username: username,
      //   password: password,
      // };
      // const response = await simulateApiLogin(credentials);
      // --------------------------------------------------------------
      console.log('Login response:', response);
      if (response.status == 200) {
        const userInformation = {
          username: response.data.username,
          nickname: response.data.nickname,
          avatar: response.data.avatar,
        };
        auth.setUser(userInformation);
        // localStorage.setItem('user', JSON.stringify(userInformation));
        const navbar = document.getElementById('navbar-container');
        navbar.innerHTML = '<navbar-component></navbar-component>';
        // const navbar = document.querySelector('navbar-component');
        // navbar.setLoginStatus(true);
        router.navigate(`/home`, response.user);
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

  setupInputToggle() {
    const idInput = this.querySelector('#inputUsername');
    const emailInput = this.querySelector('#inputEmail');

    idInput.addEventListener('input', this.toggleInputFields.bind(this));
    emailInput.addEventListener('input', this.toggleInputFields.bind(this));
  }

  toggleInputFields() {
    const idInput = this.querySelector('#inputUsername');
    const emailInput = this.querySelector('#inputEmail');

    if (idInput.value) {
      emailInput.disabled = true;
      emailInput.value = '';
    } else {
      emailInput.disabled = false;
    }
    if (emailInput.value) {
      idInput.disabled = true;
      idInput.value = '';
    } else {
      idInput.disabled = false;
    }
  }

  checkInputs() {
    const loginIdField = this.querySelector('#inputUsername');
    const emailField = this.querySelector('#inputEmail');
    const passwordField = this.querySelector('#inputPassword');

    let isValid = true;
    if (!loginIdField.value.trim() && !emailField.value.trim()) {
      loginIdField.classList.add('is-invalid');
      emailField.classList.add('is-invalid');
      document.querySelector('#loginid-feedback').textContent = 'Login ID or email is required';
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
    const loginIdField = this.querySelector('#inputUsername');
    const emailField = this.querySelector('#inputEmail');
    const passwordField = this.querySelector('#inputPassword');

    loginIdField.addEventListener('input', () => {
      loginIdField.classList.remove('is-invalid');
      emailField.classList.remove('is-invalid');
      document.querySelector('#loginid-feedback').textContent = '';
    });
    emailField.addEventListener('input', () => {
      loginIdField.classList.remove('is-invalid');
      emailField.classList.remove('is-invalid');
      document.querySelector('#loginid-feedback').textContent = '';
    });
    passwordField.addEventListener('input', () => {
      passwordField.classList.remove('is-invalid');
      document.querySelector('#loginpassword-feedback').textContent = '';
    });
  }
}

customElements.define('login-form', LoginForm);
