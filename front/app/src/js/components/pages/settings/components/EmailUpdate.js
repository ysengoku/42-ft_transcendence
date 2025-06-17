import { INPUT_FEEDBACK } from '@utils';

export class EmailUpdate extends HTMLElement {
  #state = {
    connectionType: 'regular',
    currentEmail: '',
  };

  constructor() {
    super();
    this.newEmail = '';
    this.isEmailFilled = this.isEmailFilled.bind(this);
    this.handleFocusout = this.handleFocusout.bind(this);
  }

  setParams(user) {
    this.#state.connectionType = user.connection_type;
    this.#state.currentEmail = user.email;
    this.render();
  }

  disconnectedCallback() {
    if (this.#state.connectionType === 'regular') {
      this.emailInput?.removeEventListener('input', this.emailFeedback);
      this.emailInput?.removeEventListener('focusout', this.handleFocusout);
    }
  }

  render() {
    this.innerHTML = this.template();

    if (this.#state.connectionType !== 'regular') {
      const field = this.querySelector('#email-settings-input');
      field.classList.add('d-none');
      return;
    }

    this.emailInput = this.querySelector('#settings-email');
    this.emailInput.value = this.#state.currentEmail;
    this.emailFeedbackField = this.querySelector('#settings-email-feedback');

    this.emailInput.addEventListener('input', this.isEmailFilled);
    this.emailInput.addEventListener('focusout', this.handleFocusout);
  }

  isEmailFilled(event) {
    if (event.target.value.length < 1) {
      this.emailFeedbackField.textContent = INPUT_FEEDBACK.CANNOT_DELETE_EMAIL;
      this.emailInput.classList.add('is-invalid');
    } else {
      this.emailFeedbackField.textContent = '';
      this.emailInput.classList.remove('is-invalid');
    }
    if (event.target.value.length > 0 && event.target.value !== this.#state.currentEmail) {
      this.newEmail = event.target.value;
    }
  }

  handleFocusout(event) {
    const focusedElement = event.relatedTarget;
    if (focusedElement && focusedElement.matches('button[type="submit"]')) {
      return;
    }
    if (event.target.value.length < 1) {
      event.target.value = this.#state.currentEmail;
      this.emailInput.classList.remove('is-invalid');
      this.emailFeedbackField.textContent = '';
    }
  }

  template() {
    return `
      <div class="mt-3" id="email-settings-input">
        <label for="settings-email" class="form-label">Email</label>
        <input type="email" class="form-control" id="settings-email" autocomplete="off">
        <div class="invalid-feedback" id="settings-email-feedback"></div>
      </div>    
    `;
  }
}

customElements.define('settings-email-update', EmailUpdate);
