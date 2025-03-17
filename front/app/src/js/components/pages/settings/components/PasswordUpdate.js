import { passwordFeedback, INPUT_FEEDBACK } from '@utils';

export class PasswordUpdate extends HTMLElement {
  #state = {
    connectionType: '',
  };

  constructor() {
    super();
    this.removeFeedback = this.removeFeedback.bind(this);
  }

  setParam(value) {
    this.#state.connectionType = value;
    this.render();
  }

  disconnectedCallback() {
    if (this.#state.connectionType === 'regular') {
      this.oldPasswordField.removeEventListener('click', this.removeFeedback);
      this.newPasswordField.removeEventListener('click', this.removeFeedback);
      this.newPasswordRepeatField.removeEventListener('click', this.removeFeedback);
    }
  }

  render() {
    this.innerHTML = this.template();

    if (this.#state.connectionType !== 'regular') {
      const field = this.querySelector('#password-setting-field');
      field.classList.add('d-none');
      return;
    }

    this.oldPasswordField = this.querySelector('#old-password');
    this.newPasswordField = this.querySelector('#new-password');
    this.newPasswordRepeatField = this.querySelector('#new-password-repeat');
    this.oldPasswordFeedback = this.querySelector('#old-password-feedback');
    this.newPasswordFeedback = this.querySelector('#new-password-feedback');
    this.newPasswordRepeatFeedback = this.querySelector('#new-password-repeat-feedback');

    this.oldPasswordField.addEventListener('click', this.removeFeedback);
    this.newPasswordField.addEventListener('click', this.removeFeedback);
    this.newPasswordRepeatField.addEventListener('click', this.removeFeedback);
  }

  checkPasswordInput() {
    if (!this.newPasswordField.value && !this.newPasswordRepeatField.value) {
      return true;
    }

    let isValid = true;
    isValid = passwordFeedback(
        this.newPasswordField, this.newPasswordRepeatField,
        this.newPasswordFeedback, this.newPasswordRepeatFeedback);
    if (!isValid) {
      return false;
    }
    // Check if old password is input when new passwords are input
    if (this.newPasswordField.value && !this.oldPasswordField.value) {
      this.oldPasswordField.classList.add('is-invalid');
      this.oldPasswordFeedback.textContent = INPUT_FEEDBACK.EMPTY_OLD_PASSWORD;
      return false;
    }
    return true;
  }

  removeFeedback() {
    this.oldPasswordField.classList.remove('is-invalid');
    this.newPasswordField.classList.remove('is-invalid');
    this.newPasswordRepeatField.classList.remove('is-invalid');
    this.oldPasswordFeedback.innerHTML = '';
    this.newPasswordFeedback.innerHTML = '';
    this.newPasswordRepeatFeedback.innerHTML = '';
  }

  template() {
    return `
    <div id="password-setting-field">
      <div class="mt-3">
        <label for="old-password" class="form-label">Current password (if change password)</label>
        <input type="password" class="form-control" id="old-password" placeholder="current password" autocomplete="off">
        <div class="invalid-feedback" id="old-password-feedback"></div>
      </div>

      <div class="mt-3">
        <label for="new-password" class="form-label">Password</label>
        <input type="password" class="form-control" id="new-password" placeholder="new password" autocomplete="off">
        <div class="invalid-feedback" id="new-password-feedback"></div>
      </div>

      <div class="mt-3">
        <label for="new-password-repeat" class="form-label">Confirm Password</label>
        <input type="password" class="form-control" id="new-password-repeat" placeholder="new password" autocomplete="off">
        <div class="invalid-feedback" id="new-password-repeat-feedback"></div>
      </div>
    </div>
    `;
  }
}

customElements.define('settings-password-update', PasswordUpdate);
