import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessage, showAlertMessageForDuration, ALERT_TYPE, ALERT_MESSAGES } from '@utils';
import './components/index.js';
// import { simulateFetchUserData } from '@mock/functions/simulateFetchUserData.js';

export class Settings extends HTMLElement {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.username = '';
    this.currentUserData = null;
    this.newUserData = null;
  }

  async connectedCallback() {
    const user = auth.getStoredUser();
    this.isLoggedIn = user ? true : false;
    if (!this.isLoggedIn) {
      showAlertMessageForDuration(ALERT_TYPE.LIGHT, ALERT_MESSAGES.SESSION_EXPIRED, 5000);
      router.navigate('/');
      return;
    }
    this.username = user.username;
    this.fetchUserData();
  }

  async fetchUserData() {
    /* eslint-disable-next-line new-cap */
    const response = await apiRequest('GET', API_ENDPOINTS.USER_SETTINGS(this.username));
    if (response.success) {
      if (response.status === 200) {
        this.currentUserData = response.data;
        this.newUserData = this.currentUserData;
        this.render();
        this.setParams();
        this.setEventListener();
        this.setupSubmitHandler();
      }
    } else {
      if (response.status === 401) {
        showAlertMessageForDuration(ALERT_TYPE.LIGHT, ALERT_MESSAGES.SESSION_EXPIRED, 5000);
        router.navigate('/');
      } else if (response.status === 403) {
        showAlertMessage(ALERT_TYPE.ERROR, ALERT_MESSAGES.UNKNOWN_ERROR);
        router.navigate('/home');
      }
    }
  }

  render() {
    this.innerHTML = `
		<div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-md-6">
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

  setParams() {
    const avatarUploadButton = this.querySelector('avatar-upload');
    avatarUploadButton.setAvatar(this.currentUserData);

    const userIdentity = this.querySelector('settings-user-identity');
    userIdentity.setParams(this.currentUserData);

    const emailField = this.querySelector('settings-email-update');
    emailField.setParams(this.currentUserData);

    const passwordField = this.querySelector('settings-password-update');
    passwordField.setParam(this.currentUserData.connection_type);

    const mfaEnable = this.querySelector('mfa-enable-update');
    mfaEnable.setParams(this.currentUserData);

    const deleteAccountButton = this.querySelector('delete-account-button');
    deleteAccountButton.setUsername(this.currentUserData.username);
  }

  setEventListener() {
    const resetButton = this.querySelector('#settings-reset-button');
    resetButton.addEventListener('click', () => {
      if (confirm('Do you really want to discard the changes?')) {
        console.log('Resetting the form', this._user);
        this.setParams(this._user);
      }
    });
  }

  setupSubmitHandler() {
    const form = this.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent the default behavior of browser (page reload)
      this.handleSubmit();
    });
  }

  async handleSubmit() {
    const userIdentityField = this.querySelector('settings-user-identity');
    const userIdentity = userIdentityField.newUserIdentity;
    const emailField = this.querySelector('settings-email-update');
    const newEmail = emailField.newEmail;

    const passwordField = this.querySelector('settings-password-update');
    if (!passwordField.checkPasswordInput()) {
      return;
    }

    const avatarUploadField = this.querySelector('avatar-upload');
    const avatarField = avatarUploadField.selectedFile;

    const formData = new FormData();
    if (userIdentity.username) {
      formData.append('username', userIdentity.username);
      this.newUserData.username = userIdentity.username;
    }
    if (userIdentity.nickname) {
      formData.append('nickname', userIdentity.nickname);
      this.newUserData.nickname = userIdentity.nickname;
    }
    if (newEmail) {
      formData.append('email', newEmail);
      this.newUserData.email = newEmail;
    }
    const oldPassword = this.querySelector('#old-password');
    const newPassword = this.querySelector('#new-password');
    const newPasswordRepeat = this.querySelector('#new-password-repeat');
    if (oldPassword.value && newPassword.value && newPasswordRepeat.value) {
      formData.append('old_password', oldPassword.value);
      formData.append('password', newPassword.value);
      formData.append('password_repeat', newPasswordRepeat.value);
    }
    // TODO: Test if it works after merge
    const mfaEnabled = this.querySelector('#mfa-switch-check').checked ? 'true' : 'false';
    const currentMfaEnabled = this.currentUserData.mfa_enabled ? 'true' : 'false';
    if (currentMfaEnabled !== mfaEnabled) {
      formData.append('mfa_enabled', mfaEnabled);
      this.newUserData.mfa_enabled = mfaEnabled;
    }
    if (avatarField) {
      formData.append('new_profile_picture', avatarField);
    }

    /* eslint-disable-next-line new-cap */
    const response = await apiRequest('POST', API_ENDPOINTS.USER_SETTINGS(this.username), formData, true);
    if (response.success) {
      this.username = response.data.username;
      this.currentUserData = this.newUserData;
      this.currentUserData.avatar = response.data.avatar;
      auth.storeUser(this.currentUserData);
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Settings updated successfully', 1000);
    } else {
      console.log('Error updating settings', response);
      if (response.status === 401) {
        return;
      }
      let errorMsg = ALERT_MESSAGES.UNKNOWN_ERROR;
      if (response.status === 413 || response.status === 422) {
        errorMsg = response.msg + ' Cannot update.';
      }
      showAlertMessage(ALERT_TYPE.ERROR, errorMsg);
    }
  }
}

customElements.define('user-settings', Settings);
