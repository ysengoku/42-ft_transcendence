import { router } from '@router';
import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';

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

    // Input validation at Front-end
    let isFormValid = true;
    isFormValid = this.checkInput(usernameField, '#username-feedback', 'Username is required');
    isFormValid = this.checkInput(emailField, '#email-feedback', 'Email is required') && isFormValid;
    isFormValid = this.checkInput(passwordField, '#password-feedback', 'Password is required') && isFormValid;
    isFormValid =
      this.checkInput(passwordRepeatField, '#password_repeat-feedback', 'Please confirm your password') && isFormValid;
    isFormValid = this.checkPasswordDiff(passwordField, passwordRepeatField) && isFormValid;
    if (!isFormValid) {
      return;
    }

    const userData = {
      username: usernameField.value,
      email: emailField.value,
      password: passwordField.value,
      password_repeat: passwordRepeatField.value,
    };

    try {
      const response = await apiRequest('POST', API_ENDPOINTS.USERS, userData);
      // console.log('Registration successful:', response);
      // TO DO: Save Token somewhere

      // ----- Temporary ------------------------------------------
      localStorage.setItem('isLoggedIn', 'true');
      const { elo, ...filteredResponse } = response;
      localStorage.setItem('user', JSON.stringify(filteredResponse));
      // ----------------------------------------------------------
      const navBar = document.getElementById('navbar-container');
      navBar.innerHTML = '<navbar-component></navbar-component>';
      router.navigate(`/home`, response.user);
    } catch (error) {
      // Error handling
      console.error('Error status:', error.status);
      if (error.status === 422) {
        // Show reison for validation error
        const errorMsg = error.response[0]?.msg || 'Validation error';
        console.error(errorMsg);
      } else {
        // Show another error message
      }
    }
  }

  checkInput(field, feedbackSelector, errorMessage) {
    if (!field.value.trim()) {
      field.classList.add('is-invalid');
      document.querySelector(feedbackSelector).textContent = errorMessage;
      return false;
    } else {
      return true;
    }
  }

  checkPasswordDiff(passwordField, passwordRepeatField) {
    if (passwordField.value != passwordRepeatField.value) {
      passwordField.classList.add('is-invalid');
      passwordRepeatField.classList.add('is-invalid');
      document.querySelector('#password-feedback').textContent = 'Passwords do not match';
      document.querySelector('#password_repeat-feedback').textContent = 'Passwords do not match';
      return false;
    } else {
      return true;
    }
  }
}

customElements.define('register-form', Register);
