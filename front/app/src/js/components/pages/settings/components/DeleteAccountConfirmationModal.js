import { Modal } from 'bootstrap';

export class DeleteAccountConfirmationModal extends HTMLElement {
  constructor() {
    super();
    this.modal = null;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = this.template();
    this.modal = new Modal(this.querySelector('.modal'));

    this.deleteButton = this.querySelector('#delete-account-confirm');
    const deleteAccountButton = document.querySelector('delete-account-button');
    this.handleDeleteAccount = () => {
      deleteAccountButton.setAttribute('confirmed', 'true');
      this.modal.hide();
    };
    this.deleteButton.addEventListener('click', this.handleDeleteAccount);
  }

  disconnectedCallback() {
    this.deleteButton.removeEventListener('click', this.handleDeleteAccount);
  }

  showModal() {
    if (this.modal) {
      this.modal.show();
    }
  }

  template() {
    return `
    <div class="modal fade" id="delete-account-confirm-modal" tabindex="-1" aria-hidden="true">
	    <div class="modal-dialog">
	      <div class="modal-content">
		      <div class="modal-body py-4">
		        Are you sure you want to delete your account?
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
			      <button type="button" class="btn btn-danger" id="delete-account-confirm">Delete account</button>
		      </div>
		    </div>
	    <div>
	  </div>
	`;
  }
}

customElements.define('delete-account-confirmation-modal', DeleteAccountConfirmationModal);
