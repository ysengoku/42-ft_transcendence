import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE } from '@utils';
import { emailFeedback, removeInputFeedback } from '@utils';

export class ForgotPassword extends HTMLElement {
  #state = {
    email: '',
  };

  constructor() {
    super();
    this.handlePasswordResetRequest = this.handlePasswordResetRequest.bind(this);
    this.handleCancelButton = () => router.navigate('/login');
    this.handleRemoveInputFeedback = this.handleRemoveInputFeedback.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.submitButton.removeEventListener('click', this.handlePasswordResetRequest);
    this.cancelButton.removeEventListener('click', this.handleCancelButton);
    this.emailField.removeEventListener('input', this.handleRemoveInputFeedback);
  }

  render() {
    this.innerHTML = this.template();

    this.submitButton = this.querySelector('#forgot-password-submit');
    this.cancelButton = this.querySelector('#cancel-forgot-password');
    this.emailField = this.querySelector('#email-for-reset-password');
    this.emailFeedbackField = this.querySelector('#email-feedback');

    this.submitButton.addEventListener('click', this.handlePasswordResetRequest);
    this.cancelButton.addEventListener('click', this.handleCancelButton);
    this.emailField.addEventListener('input', this.handleRemoveInputFeedback);
  }

  async handlePasswordResetRequest(event) {
    event.preventDefault();
    if (!emailFeedback(this.emailField, this.emailFeedbackField)) {
      return;
    }
    this.#state.email = this.emailField.value;
    const response = await apiRequest(
        'POST', API_ENDPOINTS.FORGOT_PASSWORD, { email: this.#state.email },
        false, false,
    );
    if (response.success) {
      this.renderEmailSentMessage();
    } else {
      const errorMessages = response.msg || 'A problem occurred. Please try again later.';
      showAlertMessage(ALERT_TYPE.ERROR, errorMessages);
    }
  }

  renderEmailSentMessage() {
    this.innerHTML = this.emailSentTemplate();

    const inputEmail = this.querySelector('#user-input-email');
    inputEmail.textContent = this.#state.email;

    const resendButton = this.querySelector('#resend-email');
    resendButton.addEventListener('click', async (event) => {
      await this.handleResendRequest(event);
    });
  }

  async handleResendRequest(event) {
    event.preventDefault();
    const response = await apiRequest(
        'POST', API_ENDPOINTS.FORGOT_PASSWORD, { email: this.#state.email },
        false, false,
    );
    if (response.success) {
      showAlertMessage(ALERT_TYPE.SUCCESS, 'Email resent successfully.');
    } else {
      const errorMessages = response.msg || 'A problem occurred. Please try again later.';
      showAlertMessage(ALERT_TYPE.ERROR, errorMessages);
    }
  }

  handleRemoveInputFeedback(event) {
    removeInputFeedback(event, this.emailFeedbackField);
  }

  template() {
    return `
	    <div class="container my-3">
        <div class="row justify-content-center py-4">
          <div class="form-container col-12 col-md-4 p-4">
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

  emailSentTemplate() {
    return `
    <div class="container my-3">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-md-4 text-center py-4">
          <p class="fs-4 my-2">Check your email</p>
          <p class="m-0">We sent a password reset link to </p>
          <strong id="user-input-email"></strong></br>
          <div class="mt-4 mb-5">
            <small>If this email address exists in our system, you will receive it shortly.</small>
          </div>
          <button class="btn w-100 mt-3" type="submit" id="resend-email">
            Don't receive email? <strong>Click to resend.</strong>
          </button>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('forgot-password', ForgotPassword);
