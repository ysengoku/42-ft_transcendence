import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { passwordFeedback } from '@utils';

export class ResetPassword extends HTMLElement {
  constructor() {
    super();
    this.token = '';
    this.password = '';
    this.passwordRepeat = '';
  }

  async setParam(param) {
    this.token = param.token;
	const authStatus = await auth.fetchAuthStatus();
    if (authStatus.success) {
      router.navigate('/home');
	  return;
    }
    this.render();
	this.setEventListener();
  }

  setEventListener() {
	const submitButton = this.querySelector('#reset-password-submit');
	submitButton.addEventListener('click', async (event) => {
	  event.preventDefault();
	  await this.handleResetPassword();
	});
  }

  async handleResetPassword() {
	const passwordField = this.querySelector('#reset-password');
	const passwordRepeatField = this.querySelector('#reset-password-repeat');
	if (!passwordFeedback(passwordField, passwordRepeatField, '#reset-password-feedback', '#reset-password-repeat-feedback')) {
		return;
	}
	this.password = passwordField.value;
	this.passwordRepeat = passwordRepeatField.value;
	const response = await apiRequest(
		'POST',
	    API_ENDPOINTS.RESET_PASSWORD(this.token),
		{ password: this.password, password_repeat: this.passwordRepeat },
		false,
		true,
	);
	if (response.success) {
	  router.navigate('/login');
	} else {
	  const feedback = this.querySelector('#reset-password-failed-feedback');
	  feedback.innerHTML = `
	    <div class="alert alert-danger" role="alert">
	      ${response.message}
	    </div>
	  `;
	}
  }

  render() {
	this.innerHTML = `
	  <div class="container my-3">
        <div class="row justify-content-center py-4">
          <div class="col-12 col-md-4">
            <div id="reset-password-failed-feedback"></div>
      		  <form class="w-100">
                <legend class="my-4 border-bottom">Reset password</legend>
                <div class="mt-5 mb-3">
                  <label for="reset-password" class="form-label">New password</label>
                  <input type="password" class="form-control" id="reset-password" placeholder="new password" autocomplete="off">
				  <div class="invalid-feedback" id="reset-password-feedback"></div>
                  <label for="reset-password-repeat" class="form-label mt-3">Confirm new password</label>
                  <input type="password" class='form-control' id='reset-password-repeat' placeholder="confirm new password" autocomplete="off">
                  <div class="invalid-feedback" id="reset-password-repeat-feedback"></div>
                </div>
                <button class="btn btn-primary w-100 mt-3" type="submit" id="reset-password-submit">
                  Reset password
                </button>
            </form>
          </div>
      </div>
	`;
  }
}

customElements.define('reset-password', ResetPassword);
