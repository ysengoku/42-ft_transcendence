import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { isFieldFilled, removeInputFeedback, INPUT_FEEDBACK } from '@utils';

export class LoginForm extends HTMLElement {
  constructor() {
    super();
    this.handleLogin = this.handleLogin.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();

    this.form = this.querySelector('#loginForm');
    this.usernameField = this.querySelector('#input-username');
    this.passwordField = this.querySelector('#input-password');
    this.usernameFeedback = this.querySelector('#username-feedback');
    this.passwordFeedback = this.querySelector('#loginpassword-feedback');

    this.handleSubmit = async (event) => {
      event.preventDefault();
      await this.handleLogin();
    };
    this.handleUsernameInput = (event) => removeInputFeedback(event, this.usernameFeedback);
    this.handlePasswordInput = (event) => removeInputFeedback(event, this.passwordFeedback);

    this.form.addEventListener('submit', this.handleSubmit);
    this.usernameField.addEventListener('input', this.handleUsernameInput);
    this.passwordField.addEventListener('input', this.handlePasswordInput);
  }

  disconnectedCallback() {
    this.form.removeEventListener('submit', this.handleSubmit);
    this.usernameField.removeEventListener('input', this.handleUsernameInput);
    this.passwordField.removeEventListener('input', this.handlePasswordInput);
  }

  async handleLogin() {
    const usernameInput = this.querySelector('#input-username').value;
    const username = usernameInput;
    const password = this.querySelector('#input-password').value;

    if (!this.checkInputs()) {
      return;
    }

    const response = await apiRequest('POST', API_ENDPOINTS.LOGIN, { username, password }, false, false);
    console.log('Login response:', response);
    if (response.success) {
      if (response.status == 200) {
        if (response.data.mfa_required) {
          sessionStorage.setItem('username', response.data.username);
          router.navigate('/mfa-verification', response.data);
        } else {
          const userInformation = {
            username: response.data.username,
            nickname: response.data.nickname,
            avatar: response.data.avatar,
          };
          auth.storeUser(userInformation);
          router.navigate(`/home`, response.user);
        }
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
    const emptyUsername = 'Username or email is required';
    let isValid = true;

    if (!isFieldFilled(this.usernameField, this.usernameFeedback, emptyUsername)) {
      isValid = false;
    }
    if (!isFieldFilled(this.passwordField, this.passwordFeedback, INPUT_FEEDBACK.EMPTY_PASSWORD)) {
      isValid = false;
    }
    return isValid;
  }

  template() {
    return `
		<div class="container d-flex flex-column justify-content-center align-items-center">
			<form class="w-100" id="loginForm">
      <legend class="mt-4 mb-5 border-bottom">Login</legend>
  			<div class="d-flex flex-column mb-3 gap-2">
    			<label for="input-username" class="form-label">Username or Email</label>
   				<input type="text" class="form-control" id="input-username" placeholder="username or email" autocomplete="off">
          <div class="invalid-feedback" id="username-feedback"></div>
  			</div>
				<div class="mb-3">
					<label for="input-password" class="form-label">Password</label>
    			<input type="password" class="form-control" id="input-password" placeholder="password" autocomplete="off">
          <div class="invalid-feedback" id="loginpassword-feedback"></div>
  			</div>
				<div class="mb-2 py-3">
					<button type="submit" id="loginSubmit" class="btn btn-primary btn-lg w-100 pt-50">Login</button>
				</div>
			</form>
		</div>
		`;
  }
}

customElements.define('login-form', LoginForm);
