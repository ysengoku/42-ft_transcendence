import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
// import { mockRegisterSuccessResponse } from '@mock/functions/mockRegister';

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
        <div class="row justify-content-center">
          <div class="col-12 col-md-4"> 
    		    <div class='container d-flex flex-column justify-content-center align-items-center'>
              <div id="signup-failed-feedback"></div>
      			  <form class='w-100'>
        			  <div class='mb-3'>
          				<label for='username' class='form-label'>Username</label>
          				<input type='username' class='form-control' id='username' placeholder='username'>
          				<div class='invalid-feedback' id='username-feedback'></div>
        			  </div>
        			  <div class='mb-3'>
          				<label for='email' class='form-label'>Email</label>
          				<input type='email' class='form-control' id='email' placeholder='email'>
          				<div class='invalid-feedback' id='email-feedback'></div>
        			  </div>
        			  <div class='mb-3'>
          				<label for='password' class='form-label'>Password</label>
        				 <input type='password' class='form-control' id='password' placeholder='password'>
        				 <div class='invalid-feedback' id='password-feedback'></div>
        			  </div>
        			  <div class='mb-3'>
        				  <label for='password_repeat' class='form-label'>Confirm Password</label>
        				  <input type='password' class='form-control' id='password_repeat' placeholder='password'>
        				  <div class='invalid-feedback' id='password_repeat-feedback'></div>
        			  </div>
        			  <div class='mb-3 py-3'>
        				  <button type='submit' id='registerSubmit' class='btn btn-primary btn-lg w-100 pt-50'>Register</button>
        			  </div>
      			  </form>
    		    </div>
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
    const emptyUsername = 'Username is required';
    const emptyEmail = 'Email is required';
    const emptyPassword = 'Password is required';
    const emptyPasswordRepeat = 'Please confirm your password';

    let isFormValid = true;
    isFormValid = this.isFieldFilled(usernameField, '#username-feedback', emptyUsername);
    isFormValid = this.isFieldFilled(emailField, '#email-feedback', emptyEmail) && isFormValid;
    isFormValid = this.isFieldFilled(passwordField, '#password-feedback', emptyPassword) && isFormValid;
    isFormValid =
      this.isFieldFilled(passwordRepeatField, '#password_repeat-feedback', emptyPasswordRepeat) && isFormValid;
    isFormValid =
      this.checkPasswordLength(passwordField) &&
      this.checkPasswordDiff(passwordField, passwordRepeatField) &&
      isFormValid;
    return isFormValid;
  }

  isFieldFilled(field, feedbackSelector, errorMessage) {
    if (!field.value.trim()) {
      field.classList.add('is-invalid');
      document.querySelector(feedbackSelector).textContent = errorMessage;
      return false;
    } else {
      return true;
    }
  }

  checkPasswordLength(passwordField) {
    const shortPassword = 'Password must be at least 8 characters';
    if (passwordField.value.length < 8) {
      passwordField.classList.add('is-invalid');
      document.querySelector('#password-feedback').textContent = shortPassword;
      return false;
    } else {
      return true;
    }
  }

  checkPasswordDiff(passwordField, passwordRepeatField) {
    const passwordsDoNotMatch = 'Passwords do not match';
    if (passwordField.value != passwordRepeatField.value) {
      passwordField.classList.add('is-invalid');
      passwordRepeatField.classList.add('is-invalid');
      document.querySelector('#password-feedback').textContent = passwordsDoNotMatch;
      document.querySelector('#password_repeat-feedback').textContent = passwordsDoNotMatch;
      return false;
    } else {
      return true;
    }
  }
}

customElements.define('register-form', Register);
