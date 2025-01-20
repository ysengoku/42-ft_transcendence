import { simulateFetchUserData } from '../../../../mock/functions/simulateFetchUserData.js'

export class Settings extends HTMLElement {
	constructor() {
		super();
	}

	setParam(param) {
		const username = param.username;
		this.fetchUserData(username);
	}

	async fetchUserData(username) {
    	try {
      		const userData = await simulateFetchUserData(username);
      		this.user = userData;
      		this.render();
    	} catch (error) {
      		console.error('Error fetching user data:', error);
			// Show "User not exists Page"?
    	}
  	}

	render() {
		// Temporay to test
		this.user.hasOwnAvatar = true;

		const avatarUploadMessage = this.user.hasOwnAvatar ? 'Change Avatar' : 'Upload Avatar';

		this.innerHTML = `
		<div class='container-fluid d-flex flex-column justify-content-center align-items-center'>
			<p>Name: ${this.user.username}</p>

			<form class='w-100'>
			<div class="d-flex justify-content-center align-items-center profile-avatar-container">
				<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
				<div class="mb-3 pt-5">
					<button class="btn btn-primary" id="avatar-upload-button">${avatarUploadMessage}</button>
				</div>
			</div>

        		<div class='mb-3'>
          			<label for='username' class='form-label'>Username</label>
          			<input type='username' class='form-control' id='username' placeholder='${this.user.username}'>
          			<div class='invalid-feedback' id='username-feedback'></div>
        			</div>
        			<div class='mb-3'>
          				<label for='email' class='form-label'>Email</label>
          				<input type='email' class='form-control' id='email' placeholder='${this.user.username}'>
          				<div class='invalid-feedback' id='email-feedback'></div>
        			</div>
        			<div class='mb-3'>
          				<label for='password' class='form-label'>Password</label>
        				<input type='password' class='form-control' id='password' placeholder='new password'>
        				<div class='invalid-feedback' id='password-feedback'></div>
        			</div>
        			<div class='mb-3'>
        				<label for='password_repeat' class='form-label'>Confirm Password</label>
        				<input type='password' class='form-control' id='password_repeat' placeholder='new password'>
        				<div class='invalid-feedback' id='password_repeat-feedback'></div>
        			</div>
        			<div class='mb-3 py-3'>
        				<button type='submit' id='settingsSubmit' class='btn btn-primary btn-lg w-100 pt-50'>Register</button>
        			</div>
      			</form>

			<div class="mb-3 pt-5">
				<a class="btn btn-primary" href="/home" role="button">Back to Home</a>
			</div>
			<avatar-upload-modal></avatar-upload-modal>
		</div>
		`;
	}
}

customElements.define('user-settings', Settings);
