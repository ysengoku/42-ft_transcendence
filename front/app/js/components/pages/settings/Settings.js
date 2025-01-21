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
		<div class="container">
			<form>
				<legend class="mb-5 border-bottom">Settings</legend>

				<div class="d-flex align-items-start mb-3 pb-5 border-bottom">
					<div class="col-6 profile-avatar-container">
						<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
					</div>
					<div class="pl-sm-4 pl-2">
						<b>Avatar</b>
						<button class="btn btn-primary" id="avatar-upload-button">${avatarUploadMessage}</button>
					</div>
				</div>

				<div class="mb-3 pb-5 border-bottom">
					<label for="username" class="form-label">Username</label>
					<input type="username" class="form-control" id="username" placeholder="${this.user.username}">
					<div class="invalid-feedback" id="username-feedback"></div>
				</div>
				<div class="mb-3 pb-5 border-bottom">
					<label for="email" class="form-label">Email</label>
					<input type="email" class="form-control" id="email" placeholder="${this.user.email}">
					<div class="invalid-feedback" id="email-feedback"></div>
				</div>
				<div class="mb-3 pb-5 border-bottom">
					<label for="password" class="form-label">Password</label>
					<input type="password" class="form-control" id="password" placeholder="new password">
					<div class="invalid-feedback" id="password-feedback"></div>
				</div>
				<div class="mb-3 pb-5">
					<label for="password_repeat" class="form-label">Confirm Password</label>
					<input type="password" class="form-control" id="password_repeat" placeholder="new password">
					<div class="invalid-feedback" id="password_repeat-feedback"></div>
				</div>

				<div class="mb-3 p-3 border-bottom">
					<a class="btn btn-outline-primary mx-2" href="/profile/${this.user.username}" role="button">Cancel</a>
					<button type="submit" id="settingsSubmit" class="btn btn-primary btn mx-2">Save changes</button>
				</div>

				<div class="mb-3 p-3">
					<a class="btn btn-danger" href="/home" role="button">Delete account</a>
				</div>
			</form>
	
			<avatar-upload-modal></avatar-upload-modal>
		</div>
		`;
	}

	setupSubmitHandler() {
		const form = this.querySelector('form');
		form.addEventListener('submit', (event) => {
	  		event.preventDefault();  // Prevent the default behavior of browser (page reload)
	  		this.handleSubmit();
		});

		
	}
}

customElements.define('user-settings', Settings);
