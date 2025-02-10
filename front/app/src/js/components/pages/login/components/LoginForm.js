import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showErrorMessage } from '@utils';
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
      <!-- <div id="login-failed-feedback"></div> -->
			<form class="w-100" id="loginForm">
  				<div class="d-flex flex-column mb-3 gap-2">
    				<label for="inputUsername" class="form-label">Username or Email</label>
   					<input type="text" class="form-control" id="inputUsername" placeholder="username">
   					<input type="text" class="form-control" id="inputEmail" placeholder="email">
            <div class='invalid-feedback' id='username-feedback'></div>
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

  async handleLogin() {
    const usernameInput = this.querySelector('#inputUsername').value;
    const emailInput = this.querySelector('#inputEmail').value;
    let username = '';
    if (usernameInput) {
      username = usernameInput;
    } else if (emailInput) {
      username = emailInput;
    }
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
        auth.setUser(userInformation);
        router.navigate(`/home`, response.user);
      }
    } else {
      showErrorMessage(response.msg);
    //   const feedback = this.querySelector('#login-failed-feedback');
    //   feedback.innerHTML = `
    //   <div class="alert alert-danger alert-dismissible" role="alert">
    //     ${response.msg}
    //     <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    //   </div>
    // `;
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
    const emailField = this.querySelector('#inputEmail');
    const passwordField = this.querySelector('#inputPassword');

    usernameField.addEventListener('input', () => {
      usernameField.classList.remove('is-invalid');
      emailField.classList.remove('is-invalid');
      document.querySelector('#username-feedback').textContent = '';
    });
    emailField.addEventListener('input', () => {
      usernameField.classList.remove('is-invalid');
      emailField.classList.remove('is-invalid');
      document.querySelector('#username-feedback').textContent = '';
    });
    passwordField.addEventListener('input', () => {
      passwordField.classList.remove('is-invalid');
      document.querySelector('#loginpassword-feedback').textContent = '';
    });
  }
}

customElements.define('login-form', LoginForm);
