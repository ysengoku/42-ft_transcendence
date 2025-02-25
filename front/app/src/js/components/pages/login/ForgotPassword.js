import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';

export class ForgotPassword extends HTMLElement {
  constructor() {
    super();
    this.email = '';
  }

  connectedCallback() {
    this.render();
    this.setEventListeners();
  }

  setEventListeners() {
    const submitButton = this.querySelector('#forgot-password-submit');
    submitButton.addEventListener('click', async (event) => {
      event.preventDefault();
      this.email = this.querySelector('#email-for-reset-password').value;
      if (!this.checkEmailInput()) {
        return;
      }
      await this.handlePasswordResetRequest();
    });

    const cancelButton = this.querySelector('#cancel-forgot-password');
    cancelButton.addEventListener('click', () => {
      router.navigate('/login');
    });
  }

  render() {
    this.innerHTML = `
	    <div class="container my-3">
        <div class="row justify-content-center py-4">
          <div class="col-12 col-md-4">
            <div id="forgot-password-failed-feedback"></div>
      			<form class="w-100">
              <legend class="mt-4 border-bottom">Forgot password?</legend>
              <small>No worries! Just enter your email and we will send you a link to reset your password.</small>
              <div class="mt-5 mb-3">
                <label for='email-for-reset-password' class='form-label'>Email</label>
                <input type="email" class='form-control' id='email-for-reset-password' placeholder="email" autocomplete="off">
                <div class="invalid-feedback" id="email-feedback"></div>
              </div>
              <button class="btn btn-primary w-100 mt-3" type="submit" id="forgot-password-submit">
                Reset password
              </button>
              <button class="btn w-100 mt-3" type="button" id="cancel-forgot-password">
                <i class="bi bi-arrow-left"></i> Go back to Login
              </button>
            </form>
          </div>
      </div>
    `;
  }

  async handlePasswordResetRequest() {
    // if (!this.checkEmailInput()) {
    //   return;
    // }
    const response = await apiRequest('POST', API_ENDPOINTS.FORGOT_PASSWORD, { email: this.email }, false, false);
    if (response.success) {
      this.renderEmailSentMessage();
    } else {
      const feedback = this.querySelector('#forgot-password-failed-feedback');
      feedback.innerHTML = `
      <div class="alert alert-danger alert-dismissible" role="alert">
        'Add error message here'
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
      `;
    }
  }

  checkEmailInput() {
    const field = this.querySelector('#email-for-reset-password');
    if (!field.value.trim()) {
      field.classList.add('is-invalid');
      const feedbackField = this.querySelector('#email-feedback');
      feedbackField.textContent = INPUT_FEEDBACK.EMPTY_EMAIL;
      return false;
    } else {
      return true;
    }
  }

  renderEmailSentMessage() {
    this.innerHTML = `
    <div class="container my-3">
      <div class="row justify-content-center py-4">
        <div class="col-12 col-md-4 text-center">
          <p class="fs-4 mb-2">Check your email</p>
          <p class="m-0">We sent a password reset link to ${this.email}</p>

          <button class="btn w-100 mt-3" type="submit" id="resend-email">
            Don't receive email? <strong>Click to resend.</strong>
          </button>
          <button class="btn w-100 mt-3" type="button" id="navigate-to-login-button">
            <i class="bi bi-arrow-left"></i> Go to Login page
          </button>
        </div>
    </div>
  `;

    const resendButton = this.querySelector('#resend-email');
    resendButton.addEventListener('click', async () => {
      await this.handlePasswordResetRequest();
    });

    const loginButton = this.querySelector('#navigate-to-login-button');
    loginButton.addEventListener('click', () => {
      router.navigate('/login');
    });
  }
}

customElements.define('forgot-password', ForgotPassword);
