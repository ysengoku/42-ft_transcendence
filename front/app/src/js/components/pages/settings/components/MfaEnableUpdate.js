export class MfaEnableUpdate extends HTMLElement {
  #state = {
    connectionType: '',
  }

  constructor() {
    super();
    this.mfaEnabled = false;
  }

  setParams(user) {
    this.#state.connectionType = user.connection_type;
    this.mfaEnabled = user.mfa_enabled;
    this.render();
  }

  render() {
    this.innerHTML = this.template();

    if (this.#state.connectionType !== 'regular') {
      const field = this.querySelector('#mfa-setting');
      field.classList.add('d-none');
    }
    // else {
      // const mfaSwitch = this.querySelector('#mfa-switch-check');
      // mfaSwitch.addEventListener('change', () => {
      //   this.mfaEnabled = !this.mfaEnabled;
      // });
    // }
  }
    
  template() {
    return `
      <div class="form-check form-switch mt-5" id="mfa-setting">
        <label for="mfa-switch-check" class="form-check-label">Enable Two-factor authentication</label>
        <input type="checkbox" class="form-check-input" role="switch" id="mfa-switch-check" ${this.mfaEnabled ? 'checked' : ''}>
      </div>
    `;
  }
}

customElements.define('mfa-enable-update', MfaEnableUpdate);
