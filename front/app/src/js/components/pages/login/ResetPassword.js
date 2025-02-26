import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { passwordFeedback, removeInputFeedback, showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class ResetPassword extends HTMLElement {
  #state = {
    token: '',
    newPassword: '',
    newPasswordRepeat: '',
  };

  constructor() {
    super();
  }

  async setParam(param) {
    this.#state.token = param.token;
    const authStatus = await auth.fetchAuthStatus();
    if (authStatus.success) {
      router.navigate('/home');
    } else {
      this.render();
    }
  }

  render() {
    this.innerHTML = this.template();

    this.passwordField = this.querySelector('#reset-password');
    this.passwordRepeatField = this.querySelector('#reset-password-repeat');
    this.passwordFeedback = this.querySelector('#reset-password-feedback');
    this.passwordRepeatFeedback = this.querySelector('#reset-password-repeat-feedback');
    this.submitButton = this.querySelector('#reset-password-submit');

    this.handleSubmit = (event) => this.handleResetPassword(event);
    this.handlePasswordInput = (event) => removeInputFeedback(event, this.passwordFeedback);
    this.handlePasswordRepeatInput = (event) => removeInputFeedback(event, this.passwordRepeatFeedback);

    this.submitButton.addEventListener('click', this.handleSubmit);
    this.passwordField.addEventListener('input', this.handlePasswordInput);
    this.passwordRepeatField.addEventListener('input', this.handlePasswordRepeatInput);
  }

  disconnectedCallback() {
    this.submitButton.removeEventListener('click', this.handleSubmit);
    this.passwordField.removeEventListener('input', this.handlePasswordInput);
    this.passwordRepeatField.removeEventListener('input', this.handlePasswordRepeatInput);
  }

  async handleResetPassword(event) {
    event.preventDefault();
    console.log('new password:', this.passwordField.value);
    if (!passwordFeedback(this.passwordField, this.passwordRepeatField,
        this.passwordFeedback, this.passwordRepeatFeedback)) {
      return;
    }
    this.#state.newPassword = this.passwordField.value;
    this.#state.newPasswordRepeat = this.passwordRepeatField.value;
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.RESET_PASSWORD(this.#state.token),
        { password: this.#state.newPassword, password_repeat: this.#state.newPasswordRepeat },
        false, false,
    );
    if (response.success) {
      const successMessage = 'Password reset successful. You can now login with your new password.';
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, successMessage, 3000);
      router.navigate('/login');
    } else {
      const errorMessage = response.message || 'Password reset failed. Please try again.';
      showAlertMessageForDuration(ALERT_TYPE.ERROR, errorMessage, 3000);
    }
  }

  template() {
    return `
    <div class="container my-4">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-md-4 p-4">
          <form class="w-100">
            <legend class="my-4 border-bottom">Reset password</legend>
            <div class="mt-5 mb-3">
              <label for="reset-password" class="form-label">New password</label>
              <input type="password" class="form-control" id="reset-password" placeholder="new password" autocomplete="off">
              <div class="invalid-feedback" id="reset-password-feedback"></div>

              <label for="reset-password-repeat" class="form-label mt-4">Confirm new password</label>
              <input type="password" class='form-control' id='reset-password-repeat' placeholder="confirm new password" autocomplete="off">
              <div class="invalid-feedback" id="reset-password-repeat-feedback"></div>
            </div>
            <button class="btn btn-primary w-100 mt-4" type="submit" id="reset-password-submit">
              Reset password
            </button>
          </form>
        </div>
      </div>
    </div>
    `;
  }

//   style() {
//     return `
// 	<style>
// 	  .form-container {
// 		background-color: rgba(128,128,128, 0.1);
// 	  }
// 	</style>
// 	`;
//   }
}

customElements.define('reset-password', ResetPassword);
