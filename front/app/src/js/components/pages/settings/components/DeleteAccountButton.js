import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessage, ALERT_TYPE } from '@utils';

export class DeleteAccountButton extends HTMLElement {
  #state = {
    username: '',
  };

  constructor() {
    super();
  }

  setUsername(username) {
    this.#state.username = username;
    this.render();
  }

  static get observedAttributes() {
    return ['confirmed'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'confirmed' && newValue === 'true') {
      this.handleDeleteAccount();
    }
  }

  render() {
    this.innerHTML = this.template();

    this.deleteButton = this.querySelector('#delete-account');
    this.confimationModal = document.querySelector('delete-account-confirmation-modal');
    this.handleSubmitButtonClick = (event) => {
      this.confimationModal.showModal();
      event.preventDefault();
    };
    this.deleteButton.addEventListener('click', this.handleSubmitButtonClick);
  }

  disconnectedCallback() {
    this.deleteButton.removeEventListener('click', this.handleSubmitButtonClick);
  }

  async handleDeleteAccount() {
    console.log('Deleting account');
    /* eslint-disable-next-line new-cap */
    const response = await apiRequest('DELETE', API_ENDPOINTS.USER_DELETE(this.#state.username), null, false, true);
    if (response.success) {
      router.navigate('/account-deleted');
    } else if (response.status !== 401) {
      console.error(response.msg);
      showAlertMessage(ALERT_TYPE.ERROR, response.msg);
    }
  }

  template() {
    return `
	  <p>Delete Account</p>
	  <button type="submit" id="delete-account" class="btn btn-danger">Delete account</button>
	  <p class="text-danger mt-2 small">
			Deleting your account is permanent and cannot be undone.
		</p>
		`;
  }
}

customElements.define('delete-account-button', DeleteAccountButton);
