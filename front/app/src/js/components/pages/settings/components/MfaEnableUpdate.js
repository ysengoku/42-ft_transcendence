export class MfaEnableUpdate extends HTMLElement {
  constructor() {
    super();
    this._user = {
      connectionType: '',
      mfaEnabled: false,
    };
  }

  setParams(user) {
    this._user.connectionType = user.connection_type;
    this._user.mfaEnabled = user.mfaEnabled;
    // console.log('Type:', this._user.connectionType);
    this.render();
  }

  render() {
    if (this._user.connectionType !== 'regular') {
      return;
    }
    this.innerHTML = `
      <div class="form-check form-switch mt-5">
        <label for="mfa-switch-check" class="form-check-label">Enable Two-factor authentication</label>
        <input type="checkbox" class="form-check-input" role="switch" id="mfa-switch-check" ${this.mfaEnabled ? 'checked' : ''}>
      </div>
    `;

    const mfaSwitch = this.querySelector('#mfa-switch-check');
    mfaSwitch.addEventListener('change', (event) => {
      this.mfaEnabled = !this.mfaEnabled;
      console.log('MFA Enabled:', this.mfaEnabled);
    });
  }
}

customElements.define('mfa-enable-update', MfaEnableUpdate);
