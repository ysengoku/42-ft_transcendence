/**
 * @module Settings
 * @description This module defines the Settings component for user settings management.
 * Input fields for username, nickname, email, password, and MFA settings are managed in its child components.
 * It handles current user data fetching, validation, and submission to the server.
 */

import { router } from '@router';
import { auth } from '@auth';
import { apiRequest, API_ENDPOINTS } from '@api';
import {
  usernameFeedback,
  nicknameFeedback,
  emailFeedback,
  showAlertMessage,
  showAlertMessageForDuration,
  ALERT_TYPE,
} from '@utils';
import './components/index.js';

export class Settings extends HTMLElement {
  /**
   * Private state of the component.
   * @property {string} #state.username - The username of the logged-in user.
   * @property {Object} #state.currentUserData - Contains the current user data fetched from the server.
   * @property {Object} #state.newUserData - Holds the new user data to be submitted.
   * @property {boolean} #state.changed - Indicates if there are changes to be submitted.
   */
  #state = {
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
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
    let user = auth.getStoredUser();
    if (!user) {
      user = await auth.getUser();
    }
    if (!user) {
      return;
    }
    this.#state.username = user.username;
    await this.fetchUserData();
    this.#state.newUserData = { ...this.#state.currentUserData };
  }

  disconnecteCallback() {
    this.form.removeEventListener('submit', this.handleSubmitClick);
    this.resetButton.removeEventListener('click', this.handleResetClick);
  }

  async fetchUserData() {
    /* eslint-disable-next-line new-cap */
    let response = await apiRequest('GET', API_ENDPOINTS.USER_SETTINGS(this.#state.username));

    switch (response.status) {
      case 200:
        this.#state.currentUserData = response.data;
        this.render();
        return;
      case 403:
        const userData = await auth.getUser();
        if (!userData) {
          return;
        }
        this.#state.username = userData.username;
        /* eslint-disable-next-line new-cap */
        response = await apiRequest('GET', API_ENDPOINTS.USER_SETTINGS(this.#state.username));
        if (response.status === 200) {
          this.#state.currentUserData = response.data;
          this.render();
          return;
        }
      case 401:
      case 429:
        return;
      default:
        router.redirect('/login');
    }
  }

  render() {
    this.innerHTML = '';
    this.innerHTML = this.template();

    this.form = this.querySelector('form');
    this.avatarUploadField = this.querySelector('avatar-upload');
    this.userIdentityField = this.querySelector('settings-user-identity');
    this.emailField = this.querySelector('settings-email-update');
    this.passwordField = this.querySelector('settings-password-update');
    this.mfaEnable = this.querySelector('mfa-enable-update');
    this.resetButton = this.querySelector('#settings-reset-button');

    this.setParams();

    this.form.addEventListener('submit', this.handleSubmitClick);
    this.resetButton.addEventListener('click', this.handleResetClick);
  }

  /**
   * @description Sets the parameters for the child components based on the current user data,
   * so that they can display the correct information.
   */
  setParams() {
    this.avatarUploadField.setAvatar(this.#state.currentUserData);
    this.userIdentityField.setParams(this.#state.currentUserData);
    this.emailField.setParams(this.#state.currentUserData);
    this.passwordField.setParam(this.#state.currentUserData.connection_type);
    this.mfaEnable.setParams(this.#state.currentUserData);
  }

  async handleSubmitClick(event) {
    event.preventDefault();
    this.handleSubmit();
  }

  /**
   *@description Handles the reset button click event.
   * If the user confirms, it resets the form to the initial state by calling setParams.
   */
  async handleResetClick() {
    if (confirm('Do you really want to discard the changes?')) {
      this.setParams();
    }
  }

  /**
   * @description Handles the form submission.
   * Validates the input fields, constructs a FormData object with the new user data,
   * checks if there are changes to be submitted,
   * sends it to the server, and updates the state based on the response.
   */
  async handleSubmit() {
    const userIdentity = this.userIdentityField.newUserIdentity;
    const newEmail = this.emailField.newEmail;
    let isValid = true;
    isValid =
      usernameFeedback(this.userIdentityField.usernameInput, this.userIdentityField.usernameFeedback) && isValid;
    isValid =
      nicknameFeedback(this.userIdentityField.nicknameInput, this.userIdentityField.nicknameFeedback) && isValid;
    if (this.#state.currentUserData.connection_type === 'regular') {
      isValid = emailFeedback(this.emailField.emailInput, this.emailField.emailFeedbackField) && isValid;
      isValid = this.passwordField.checkPasswordInput() && isValid;
    }
    if (!isValid) {
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
      showAlertMessageForDuration(ALERT_TYPE.LIGHT, 'No changes to save', 2000);
      return;
    }
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
      auth.updateStoredUser(this.#state.currentUserData);
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Settings updated successfully', 2000);
    } else {
      if (response.status === 401 || response.status === 429) {
        return;
      }
      let errorMsg = 'An unexpected error occurred. Please try again later.';
      if (response.status === 413 || response.status === 422) {
        errorMsg = response.msg + ' Cannot update.';
      }
      showAlertMessage(ALERT_TYPE.ERROR, errorMsg);
    }
  }

  template() {
    return `
    <div class="container mt-3 mb-4">
      <div class="row justify-content-center">
        <div class="form-container col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 p-4">
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
            
            <div class="d-flex flex-row justify-content-end mt-5 pb-3">
              <button type="button" class="btn mx-2" id="settings-reset-button">Reset</button>
              <button type="submit" class="btn btn-wood mx-2">Save changes</button>
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
