import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { isFieldFilled, passwordFeedback, INPUT_FEEDBACK } from '@utils';

export class Register extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.setupRegisterHandler();

    const inputFields = this.querySelectorAll('input');
    inputFields.forEach((field) => {
      field.addEventListener('input', () => {
        field.classList.remove('is-invalid');
        document.querySelector('#username-feedback').textContent = '';
      });
    });
  }

  render() {
    this.innerHTML = `
      <div class="container">
        <div class="row justify-content-center py-4">
          <div class="col-12 col-md-4"> 
              <div id="signup-failed-feedback"></div>
              <form class='w-100'>
                <legend class="mt-4 mb-5 border-bottom">Sign Up</legend>

                <div class='mb-3'>
                  <label for='username' class='form-label'>Username</label>
                  <input type='username' class='form-control' id='username' placeholder='username' autocomplete="off">
                  <div class='invalid-feedback' id='username-feedback'></div>
                </div>

                <div class='mb-3'>
                  <label for='email' class='form-label'>Email</label>
                  <input type='email' class='form-control' id='email' placeholder='email' autocomplete="off">
                  <div class='invalid-feedback' id='email-feedback'></div>
                </div>

                <div class='mb-3'>
                  <label for='password' class='form-label'>Password</label>
                 <input type='password' class='form-control' id='password' placeholder='password' autocomplete="off">
                 <div class='invalid-feedback' id='password-feedback'></div>
                </div>

                <div class='mb-3'>
                  <label for='password_repeat' class='form-label'>Confirm Password</label>
                  <input type='password' class='form-control' id='password_repeat' placeholder='password' autocomplete="off">
                  <div class='invalid-feedback' id='password-repeat-feedback'></div>
                </div>

                <div class='mb-3 py-3'>
                  <button type='submit' id='registerSubmit' class='btn btn-primary btn-lg w-100 pt-50'>Sign Up</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
  }

  setupRegisterHandler() {
    const form = this.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent the default behavior of browser (page reload)
      this.handleRegister();
    });
  }

  async handleRegister() {
    const usernameField = this.querySelector('#username');
    const emailField = this.querySelector('#email');
    const passwordField = this.querySelector('#password');
    const passwordRepeatField = this.querySelector('#password_repeat');
    if (!this.checkInputFields(usernameField, emailField, passwordField, passwordRepeatField)) {
      return;
    }
    const userData = {
      username: usernameField.value,
      email: emailField.value,
      password: passwordField.value,
      password_repeat: passwordRepeatField.value,
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
      const feedback = this.querySelector('#signup-failed-feedback');
      feedback.innerHTML = `
        <div class="alert alert-danger alert-dismissible" role="alert">
          ${response.msg}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }

  checkInputFields(usernameField, emailField, passwordField, passwordRepeatField) {
    let isFormValid = true;
    isFormValid = isFieldFilled(usernameField, '#username-feedback', INPUT_FEEDBACK.EMPTY_USERNAME);
    isFormValid = isFieldFilled(emailField, '#email-feedback', INPUT_FEEDBACK.EMPTY_EMAIL) && isFormValid;
    isFormValid = passwordFeedback(passwordField, passwordRepeatField, '#password-feedback', '#password-repeat-feedback') && isFormValid;

    return isFormValid;
  }
}

customElements.define('register-form', Register);
