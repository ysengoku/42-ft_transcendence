import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { emailFeedback, showAlertMessage, showAlertMessageForDuration, ALERT_TYPE, ERROR_MESSAGES } from '@utils';
import './components/index.js';

export class Settings extends HTMLElement {
  #state = {
    isLoggedIn: false,
    username: '',
    currentUserData: null,
    newUserData: null,
    changed: false,
  };

  constructor() {
    super();
    this.handleSubmitClick = this.handleSubmitClick.bind(this);
    this.handleResetClick = this.handleResetClick.bind(this);
  }

  async connectedCallback() {
    const user = auth.getStoredUser();
    this.#state.isLoggedIn = user ? true : false;
    if (!this.#state.isLoggedIn) {
      showAlertMessageForDuration(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED, 5000);
      router.navigate('/');
      return;
    }
    this.#state.username = user.username;
    await this.fetchUserData();
    this.#state.newUserData = this.#state.currentUserData;
  }

  disconnecteCallback() {
    this.form.removeEventListener('submit', this.handleSubmitClick);
    this.resetButton.removeEventListener('click', this.handleResetClick);
  }

  async fetchUserData() {
    /* eslint-disable-next-line new-cap */
    const response = await apiRequest('GET', API_ENDPOINTS.USER_SETTINGS(this.#state.username));
    if (response.success) {
      if (response.status === 200) {
        this.#state.currentUserData = response.data;
        this.render();
      }
    } else {
      if (response.status === 401) {
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED, 5000);
        router.navigate('/');
      } else if (response.status === 403) {
        showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.UNKNOWN_ERROR);
        router.navigate('/home');
      }
    }
  }

  render() {
    this.innerHTML = this.template();

    this.form = this.querySelector('form');
    this.avatarUploadField = this.querySelector('avatar-upload');
    this.userIdentityField = this.querySelector('settings-user-identity');
    this.emailField = this.querySelector('settings-email-update');
    this.passwordField = this.querySelector('settings-password-update');
    this.mfaEnable = this.querySelector('mfa-enable-update');
    this.deleteAccountButton = this.querySelector('delete-account-button');
    this.resetButton = this.querySelector('#settings-reset-button');

    this.setParams();

    this.form.addEventListener('submit', this.handleSubmitClick);
    this.resetButton.addEventListener('click', this.handleResetClick);
  }

  setParams() {
    this.avatarUploadField.setAvatar(this.#state.currentUserData);
    this.userIdentityField.setParams(this.#state.currentUserData);
    this.emailField.setParams(this.#state.currentUserData);
    this.passwordField.setParam(this.#state.currentUserData.connection_type);
    this.mfaEnable.setParams(this.#state.currentUserData);
    this.deleteAccountButton.setUsername(this.#state.currentUserData.username);
  }

  async handleSubmitClick(event) {
    event.preventDefault();
    this.handleSubmit();
  }

  async handleResetClick() {
    if (confirm('Do you really want to discard the changes?')) {
      this.setParams();
    }
  }

  async handleSubmit() {
    const userIdentity = this.userIdentityField.newUserIdentity;
    const newEmail = this.emailField.newEmail;

    if (this.#state.currentUserData.connection_type === 'regular' &&
       (!emailFeedback(this.emailField.emailInput, this.emailField.emailFeedbackField) ||
        !this.passwordField.checkPasswordInput())) {
      return;
    }

    const avatarField = this.avatarUploadField.selectedFile;

    const formData = new FormData();
    if (userIdentity.username) {
      formData.append('username', userIdentity.username);
      this.#state.newUserData.username = userIdentity.username;
      this.#state.changed = true;
    }
    if (userIdentity.nickname) {
      formData.append('nickname', userIdentity.nickname);
      this.#state.newUserData.nickname = userIdentity.nickname;
      this.#state.changed = true;
    }
    if (newEmail) {
      formData.append('email', newEmail);
      this.#state.newUserData.email = newEmail;
      this.#state.changed = true;
    }
    const oldPassword = this.querySelector('#old-password');
    const newPassword = this.querySelector('#new-password');
    const newPasswordRepeat = this.querySelector('#new-password-repeat');
    if (oldPassword.value && newPassword.value && newPasswordRepeat.value) {
      formData.append('old_password', oldPassword.value);
      formData.append('password', newPassword.value);
      formData.append('password_repeat', newPasswordRepeat.value);
      this.#state.changed = true;
    }
    const mfaEnabled = this.querySelector('#mfa-switch-check').checked ? 'true' : 'false';
    const currentMfaEnabled = this.#state.currentUserData.mfa_enabled ? 'true' : 'false';
    if (currentMfaEnabled !== mfaEnabled) {
      formData.append('mfa_enabled', mfaEnabled);
      this.#state.newUserData.mfa_enabled = mfaEnabled;
      this.#state.changed = true;
    }
    if (avatarField) {
      formData.append('new_profile_picture', avatarField);
      this.#state.changed = true;
    }

    if (!this.#state.changed) {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, 'No changes to save', 2000);
      return;
    }
    /* eslint-disable-next-line new-cap */
    const response = await apiRequest(
        'POST',
        /* eslint-disable-next-line new-cap */
        API_ENDPOINTS.USER_SETTINGS(this.#state.username),
        formData,
        true,
    );
    if (response.success) {
      this.#state.username = response.data.username;
      this.#state.currentUserData = this.#state.newUserData;
      this.#state.currentUserData.avatar = response.data.avatar;
      auth.storeUser(this.#state.currentUserData);
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Settings updated successfully', 2000);
    } else {
      console.log('Error updating settings', response);
      if (response.status === 401) {
        return;
      }
      let errorMsg = ERROR_MESSAGES.UNKNOWN_ERROR;
      if (response.status === 413 || response.status === 422) {
        errorMsg = response.msg + ' Cannot update.';
      }
      showAlertMessage(ALERT_TYPE.ERROR, errorMsg);
    }
  }

  template() {
    return `
		<div class="container">
      <div class="row justify-content-center">
        <delete-account-confirmation-modal></delete-account-confirmation-modal>
        <div class="form-container col-12 col-md-6 p-4">
			    <form class="w-100">
				    <legend class="mt-4 mb-3 border-bottom">Settings</legend>
				    <div class="mt-3">
					    <avatar-upload></avatar-upload>
				    </div>
				    <div>
              <settings-user-identity></settings-user-identity>
				    </div>
            <div>
              <settings-email-update></settings-email-update></div>
				    <div>
              <settings-password-update></settings-password-update>
				    </div>
				    <div>
              <mfa-enable-update></mfa-enable-update>
				    </div>
            
				    <div class="mt-5 pb-5 border-bottom">
              <button type="reset" class="btn btn-outline-primary mx-2" id="settings-reset-button">Reset</button>
					    <button type="submit" class="btn btn-primary mx-2">Save changes</button>
				    </div>

				    <div class="mt-4 mb-3">
					    <delete-account-button></delete-account-button>
				    </div>
			    </form>
	
			    <avatar-upload-modal></avatar-upload-modal>
		    </div>
      </div>
    </div>
		`;
  }
}

customElements.define('user-settings', Settings);
