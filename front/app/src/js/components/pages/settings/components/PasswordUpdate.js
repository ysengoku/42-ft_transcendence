import { INPUT_FEEDBACK } from '@utils';

export class PasswordUpdate extends HTMLElement {
  constructor() {
    super();
    this.connectionType = '';
  }

  setParam(value) {
    this.connectionType = value;
    this.render();
  }

  render() {
    if (this.connectionType !== 'regular') {
      return;
    }
    this.innerHTML = `
      <div class="mt-3">
        <label for="old-password" class="form-label">Current password (if you would like to change your password)</label>
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
    `;

    const oldPasswordField = this.querySelector('#old-password');
    const newPasswordField = this.querySelector('#new-password');
    const newPasswordRepeatField = this.querySelector('#new-password-repeat');

    oldPasswordField.addEventListener('input', (event) => {
      const feedback = this.querySelector('#old-password-feedback');
      oldPasswordField.classList.remove('is-invalid');
      feedback.textContent = '';
    });
    newPasswordField.addEventListener('input', (event) => {
      const feedback = this.querySelector('#new-password-feedback');
      newPasswordField.classList.remove('is-invalid');
      feedback.textContent = '';
    });
    newPasswordRepeatField.addEventListener('input', (event) => {
      const feedback = this.querySelector('#new-password-repeat-feedback');
      newPasswordRepeatField.classList.remove('is-invalid');
      feedback.textContent = '';
    });
  }

  checkPasswordInput() {
    const oldPasswordField = this.querySelector('#old-password');
    const newPasswordField = this.querySelector('#new-password');
    const newPasswordRepeatField = this.querySelector('#new-password-repeat');
    // Teree is no change request in password
    if (!oldPasswordField.value && !newPasswordField.value && !newPasswordRepeatField.value) {
      return true;
    }

    const oldPasswordFeedback = this.querySelector('#old-password-feedback');
    const newPasswordFeedback = this.querySelector('#new-password-feedback');
    const newPasswordRepeatFeedback = this.querySelector('#new-password-repeat-feedback');

    let isValid = true;
    // Check password length
    isValid = this.checkPasswordLength(oldPasswordField, oldPasswordFeedback);
    isValid = this.checkPasswordLength(newPasswordField, newPasswordFeedback) && isValid;
    isValid = this.checkPasswordLength(newPasswordRepeatField, newPasswordRepeatFeedback) && isValid;
    if (!isValid) {
      return false;
    }
    // Check if both new password fields are input
    isValid = !this.isPasswordInputEmpty(newPasswordField, newPasswordFeedback);
    isValid = !this.isPasswordInputEmpty(newPasswordRepeatField, newPasswordRepeatFeedback) && isValid;
    if (!isValid) {
      return false;
    }
    // Check if old password is input when new password is input
    if (newPasswordField.value && !oldPasswordField.value) {
      oldPasswordField.classList.add('is-invalid');
      oldPasswordFeedback.textContent = INPUT_FEEDBACK.EMPTY_OLD_PASSWORD;
      return false;
    }
    // isValid = !this.isPasswordInputEmpty(oldPasswordField, oldPasswordFeedback);
    // Check if new passwords match
    if (!this.newPasswordsMatch(newPasswordField, newPasswordRepeatField)) {
      return false;
    }
    return true;
  }

  checkPasswordLength(passwordField, feedbackField) {
    if (passwordField.value.length > 1 && passwordField.value.length < 8) {
      passwordField.classList.add('is-invalid');
      feedbackField.textContent = INPUT_FEEDBACK.PASSWORD_TOO_SHORT;
      return false;
    }
    return true;
  }

  isPasswordInputEmpty(passwordField, feedbackFild) {
    if (!passwordField.value) {
      passwordField.classList.add('is-invalid');
      feedbackFild.textContent = INPUT_FEEDBACK.EMPTY_PASSWORD;
      return true;
    }
    return false;
  }

  newPasswordsMatch(passwordField, passwordRepeatField) {
    if (passwordField.value !== passwordRepeatField.value) {
      passwordField.classList.add('is-invalid');
      passwordRepeatField.classList.add('is-invalid');
      this.querySelector('#new-password-feedback').textContent = INPUT_FEEDBACK.PASSWORDS_NOT_MATCH;
      this.querySelector('#new-password-repeat-feedback').textContent = INPUT_FEEDBACK.PASSWORDS_NOT_MATCH;
      return false;
    }
    return true;
  }
}

customElements.define('settings-password-update', PasswordUpdate);
