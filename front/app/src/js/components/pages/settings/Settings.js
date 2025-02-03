import { router } from '@router';
import './components/index.js';
import { simulateFetchUserData } from '@mock/functions/simulateFetchUserData.js';

export class Settings extends HTMLElement {
  constructor() {
    super();
    this.user = null;
  }

  connectedCallback() {
    this.fetchUserData();
  }

  async fetchUserData() {
    const user = localStorage.getItem('user');
    if (!user) {
      // Show a messages to user
      router.navigate('/login');
    }
    const username = JSON.parse(user).username;
    try {
      // Temporary fetch function with mock
      const userData = await simulateFetchUserData(username);
      this.user = userData;
      this.render();
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Show a message to user
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
              <settings-user-info></settings-user-info>
				    </div>
				    <div>
              <settings-password-update></settings-password-update>
				    </div>
				    <div>
              <mfa-enable-update></mfa-enable-update>
				    </div>
            
				    <div class="mt-5 pb-5 border-bottom">
					    <a class="btn btn-outline-primary" href="/profile/${this.user.username}" role="button">Cancel</a>
					    <button type="submit" id="settingsSubmit" class="btn btn-primary mx-2">Save changes</button>
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
    
    const avatarUploadButton = this.querySelector('avatar-upload');
    avatarUploadButton.setAvatar(this.user);
    const userInfo = this.querySelector('settings-user-info');
    userInfo.setUserInfo(this.user);
    const mfaEnable = this.querySelector('mfa-enable-update');
    mfaEnable.setParam(this.user.mfa_enabled);

    const deleteAccountButton = this.querySelector('delete-account-button');
    deleteAccountButton.setUsername(this.user.username);

    this.setupSubmitHandler();
  }

  setupSubmitHandler() {
    const form = this.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent the default behavior of browser (page reload)
      this.handleSubmit();
    });
  }

  async handleSubmit() {
    const userInfoField = this.querySelector('settings-user-info');
    const userInfo = userInfoField.newUserInfo;

    const passwordField = this.querySelector('settings-password-update');
    if (!passwordField.checkPasswordInput()) {
      return;
    }
    
    const avatarUploadField = this.querySelector('avatar-upload');
    const avatarField = avatarUploadField.selectedFile;
    
    const formData = new FormData();
    // If there are any changes, append to formData
    if (userInfo.username) {
      formData.append('username', userInfo.username);
    }
    if (userInfo.nickname) {
      formData.append('nickname', userInfo.nickname);
    }
    if (userInfo.email) {
      formData.append('email', emailField.value);
    }
    // If there is password change request, append to formData
    const oldPassword = this.querySelector('#old-password');
    const newPassword = this.querySelector('#new-password');
    const newPasswordRepeat = this.querySelector('#new-password-repeat');
    if (oldPassword.value && newPassword.value && newPasswordRepeat.value) {
      formData.append('old-password', oldPassword);
      formData.append('password', newPassword);
      formData.append('password-repeat', newPasswordRepeat);
    }

    // TODO: Check if 2FA enabled status changed, if yes append to formData
    // formData.append('mfa-enabled', this.querySelector('#mfa-switch-check').checked);

    if (avatarField) {
      formData.append('avatar', avatarField);
    }
    try {
      for (let [key, value] of formData.entries()) {
      	console.log(key, value);
        // const response = await apiRequest('POST', 'endpoint', formData, true);
        // handle response
      }
    } catch (error) {
      console.error('Error upload user settings: ', error);
    }
  }
}

customElements.define('user-settings', Settings);
