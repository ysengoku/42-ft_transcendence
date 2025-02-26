import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showFormErrorFeedback, isFieldFilled, passwordFeedback, removeInputFeedback, INPUT_FEEDBACK } from '@utils';

export class Register extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();

    this.form = this.querySelector('form');
    this.usernameField = this.querySelector('#username');
    this.emailField = this.querySelector('#email');
    this.passwordField = this.querySelector('#password');
    this.passwordRepeatField = this.querySelector('#password_repeat');
    this.usernameFeedback = this.querySelector('#username-feedback');
    this.emailFeedback = this.querySelector('#email-feedback');
    this.passwordFeedback = this.querySelector('#password-feedback');
    this.passwordRepeatFeedback = this.querySelector('#password-repeat-feedback');

    this.handleSubmit = async (event) => {
      event.preventDefault();
      await this.handleRegister();
    };
    this.handleUsernameInput = (event) => removeInputFeedback(event, this.usernameFeedback);
    this.handleEmailInput = (event) => removeInputFeedback(event, this.emailFeedback);
    this.handlePasswordInput = (event) => removeInputFeedback(event, this.passwordFeedback);
    this.handlePasswordRepeatInput = (event) => removeInputFeedback(event, this.passwordRepeatFeedback);

    this.form.addEventListener('submit', this.handleSubmit);
    this.usernameField.addEventListener('input', this.handleUsernameInput);
    this.emailField.addEventListener('input', this.handleEmailInput);
    this.passwordField.addEventListener('input', this.handlePasswordInput);
    this.passwordRepeatField.addEventListener('input', this.handlePasswordRepeatInput);
  }

  disconnectedCallback() {
    this.form.removeEventListener('submit', this.handleSubmit);
    this.usernameField.removeEventListener('input', this.handleUsernameInput);
    this.emailField.removeEventListener('input', this.handleEmailInput);
    this.passwordField.removeEventListener('input', this.handlePasswordInput);
    this.passwordRepeatField.removeEventListener('input', this.handlePasswordRepeatInput);
  }

  async handleRegister() {
    if (!this.checkInputFields()) {
      return;
    }
    const userData = {
      username: this.usernameField.value,
      email: this.emailField.value,
      password: this.passwordField.value,
      password_repeat: this.passwordRepeatField.value,
    };

    const response = await apiRequest('POST', API_ENDPOINTS.SIGNUP, userData, false, false);

    if (response.success) {
      console.log('Registration successful:', response);
      if (response.status === 200) {
        const userInformation = {
          username: response.data.username,
          nickname: response.data.nickname,
          avatar: response.data.avatar,
        };
        auth.storeUser(userInformation);
        router.navigate(`/home`, response.user);
      }
    } else {
      console.error('Registration failed:', response.msg);
      this.feedbackField = this.querySelector('#signup-failed-feedback');
      this.feedbackField.innerHTML = '';
      showFormErrorFeedback(this.feedbackField, response.msg);
    }
  }

  checkInputFields() {
    let isFormValid = true;
    isFormValid = isFieldFilled(this.usernameField, this.usernameFeedback, INPUT_FEEDBACK.EMPTY_USERNAME);
    isFormValid = isFieldFilled(this.emailField, this.emailFeedback, INPUT_FEEDBACK.EMPTY_EMAIL) && isFormValid;
    isFormValid =
      passwordFeedback(this.passwordField, this.passwordRepeatField,
          this.passwordFeedback, this.passwordRepeatFeedback) && isFormValid;

    return isFormValid;
  }

  template() {
    return `
      <div class="container">
        <div class="row justify-content-center py-4">
          <div class="form-container col-12 col-md-4 p-4"> 
              <div id="signup-failed-feedback"></div>
              <form class="w-100">
                <legend class="mt-4 mb-5 border-bottom">Sign Up</legend>

                <div class="mb-3">
                  <label for="username" class="form-label">Username</label>
                  <input type="username" class="form-control" id="username" placeholder="username" autocomplete="off">
                  <div class="invalid-feedback" id="username-feedback"></div>
                </div>

                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input type="email" class="form-control" id="email" placeholder="email" autocomplete="off">
                  <div class="invalid-feedback" id="email-feedback"></div>
                </div>

                <div class="mb-3">
                  <label for="password" class="form-label">Password</label>
                 <input type="password" class="form-control" id="password" placeholder="password" autocomplete="off">
                 <div class="invalid-feedback" id="password-feedback"></div>
                </div>

                <div class="mb-3">
                  <label for="password_repeat" class="form-label">Confirm Password</label>
                  <input type="password" class="form-control" id="password_repeat" placeholder="password" autocomplete="off">
                  <div class="invalid-feedback" id="password-repeat-feedback"></div>
                </div>

                <div class="mb-3 py-3">
                  <button type="submit" id="registerSubmit" class="btn btn-primary btn-lg w-100 pt-50">Sign Up</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
  }
}

customElements.define('register-form', Register);
