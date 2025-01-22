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
		<div class="mb-3 p-3">
			<p>Delete Account</p>
				<p class="text-danger mb-3 small">
					Deleting your account is permanent and cannot be undone.
				</p>
			<button type="submit" id="delete-account" class="btn btn-danger">Delete account</button>
		</div>
		`;
	}
}

customElements.define('delete-account-button', DeleteAccountButton);
