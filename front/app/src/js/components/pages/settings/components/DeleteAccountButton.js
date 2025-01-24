export class DeleteAccountButton extends HTMLElement {
	constructor() {
		super();
		this._username = '';
		this.render();
	}

	setUsername(username) {
		this._username = username;
		// console.log(username);
		this.render();
	}

	render() {
		this.innerHTML = `
		<p>Delete Account</p>
		<button type="submit" id="delete-account" class="btn btn-danger">Delete account</button>
		<p class="text-danger mt-2 small">
				Deleting your account is permanent and cannot be undone.
		</p>
		`;
	}
}

customElements.define('delete-account-button', DeleteAccountButton);
