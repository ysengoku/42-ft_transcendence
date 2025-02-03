import { INPUT_FEEDBACK } from '@utils/inputFeedback.js';

export class EmailUpdate extends HTMLElement {
  constructor() {
	super();
	this._user = {
	  registrationType: '',
	  email: '',
	};
	this.newEmail = '';
  }

  setParams(user) {
	this._user.registrationType = user.registration_type;
	this._user.email = user.email;
	this.render();
  }

  render() {
	if (this._user.registrationType !== 'regular') {
		return;
	}
	this.innerHTML = `
	  <div class="mt-3">
		<label for="settings-email" class="form-label">Email</label>
		<input type="email" class="form-control" id="settings-email" value="${this._user.email}">
		<div class="invalid-feedback" id="settings-email-feedback"></div>
	  </div>	
	`;

	const emailInput = this.querySelector('#settings-email');
	emailInput.addEventListener('input', (event) => {
		const feedback = this.querySelector('#settings-email-feedback');
		if (event.target.value.length < 1) {
			feedback.textContent = INPUT_FEEDBACK.EMPTY_EMAIL;
			emailInput.classList.add('is-invalid');
		} else {
			feedback.textContent = '';
			emailInput.classList.remove('is-invalid');
		}
		if (event.target.value !== this._user.email) {
			this.newEmail = event.target.value;
		}
	});
  }
}

customElements.define('settings-email-update', EmailUpdate);
