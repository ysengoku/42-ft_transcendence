export class MfaEnableUpdate extends HTMLElement {
  constructor() {
	super();
	this.mfa_enabled = false;
}

  setParam(value) {
	this.mfa_enabled = value;
	this.render();
  }

  render() {
    this.innerHTML = `
	  <div class="form-check form-switch mt-5">
		<label for="mfa-switch-check" class="form-check-label">Enable Two-factor authentication</label>
		<input type="checkbox" class="form-check-input" role="switch" id="mfa-switch-check" ${this.mfa_enabled ? 'checked' : ''}>
	  </div>
	`;

	const mfaSwitch = this.querySelector('#mfa-switch-check');
	mfaSwitch.addEventListener('change', (event) => {
	  this.mfa_enabled = !this.mfa_enabled;
	  console.log('MFA Enabled:', this.mfa_enabled);
	});
  }
}

customElements.define('mfa-enable-update', MfaEnableUpdate);
