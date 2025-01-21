import { simulateFetchUserData } from '../../../../mock/functions/simulateFetchUserData.js'
import './components/index.js';

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
		this.innerHTML = `
		<div class="container">
			<form>
				<legend class="mb-5 border-bottom">Settings</legend>
				<div>
					<avatar-upload></avatar-upload>
				</div>

				<div class="mb-3 pb-3">
					<label for="username" class="form-label">Username</label>
					<input type="username" class="form-control" id="username" placeholder="${this.user.username}">
				</div>
				<div class="mb-3 pb-3">
					<label for="email" class="form-label">Email</label>
					<input type="email" class="form-control" id="email" placeholder="${this.user.email}">
				</div>
				<div class="mb-3 pb-3">
					<label for="password" class="form-label">Password</label>
					<input type="password" class="form-control" id="password" placeholder="new password">
					<div class="invalid-feedback" id="password-feedback"></div>
				</div>
				<div class="mb-3 pb-3">
					<label for="password_repeat" class="form-label">Confirm Password</label>
					<input type="password" class="form-control" id="password_repeat" placeholder="new password">
					<div class="invalid-feedback" id="password_repeat-feedback"></div>
				</div>

				<div class="mb-5 py-5 border-bottom">
					<a class="btn btn-outline-primary" href="/profile/${this.user.username}" role="button">Cancel</a>
					<button type="submit" id="settingsSubmit" class="btn btn-primary mx-2">Save changes</button>
				</div>

				<delete-account-button></delete-account-button>
			</form>
	
			<avatar-upload-modal></avatar-upload-modal>
		</div>
		`;

		const avatarUploadButton = this.querySelector('avatar-upload');
		avatarUploadButton.setAvatar(this.user);

		const deleteAccountButton = this.querySelector('delete-account-button');
		deleteAccountButton.setUsername(this.user.username);

		this.setupSubmitHandler();
	}

	setupSubmitHandler() {
		const form = this.querySelector('form');
		form.addEventListener('submit', (event) => {
	  		event.preventDefault();  // Prevent the default behavior of browser (page reload)
	  		this.handleSubmit();
		});
	}

	async handleSubmit() {
		const usernameField = this.querySelector('#username');
		const emailField = this.querySelector('#email');
		const passwordField = this.querySelector('#password');
		const password_repeatField = this.querySelector('#password_repeat');

		const userData = {
			username: usernameField.value,
			email: emailField.value,
			password: passwordField.value,
			password_repeat: password_repeatField.value
		};	

	}
}

customElements.define('user-settings', Settings);
