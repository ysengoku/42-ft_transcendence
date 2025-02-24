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
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="form-check form-switch mt-5" id="mfa-setting">
        <label for="mfa-switch-check" class="form-check-label">Enable Two-factor authentication</label>
        <input type="checkbox" class="form-check-input" role="switch" id="mfa-switch-check" ${this.mfaEnabled ? 'checked' : ''}>
      </div>
    `;

    if (this._user.connectionType !== 'regular') {
      const field = this.querySelector('#mfa-setting');
      field.classList.add('d-none');
    } else {
      const mfaSwitch = this.querySelector('#mfa-switch-check');
      mfaSwitch.addEventListener('change', (event) => {
        this.mfaEnabled = !this.mfaEnabled;
      });
    }
  }
}

customElements.define('mfa-enable-update', MfaEnableUpdate);
