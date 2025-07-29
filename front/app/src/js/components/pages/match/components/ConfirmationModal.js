import { Modal } from 'bootstrap';

export class ConfirmationModal extends HTMLElement {
  constructor() {
    super();
    this.modal = null;

    this.handleConfirm = null;
    this.handleCancel = null;

    this.modal = null;
    this.modalElement = null;
    this.confirmButton = null;
    this.cancelButton = null;

    this.clearFocusInModal = this.clearFocusInModal.bind(this);
  }

  set handleConfirm(callback) {
    this._handleConfirm = callback;
    this.confirmButton?.addEventListener('click', this._handleConfirm);
  }

  set handleCancel(callback) {
    this._handleCancel = callback;
    this.cancelButton?.addEventListener('click', this._handleCancel);
  }

  disconnectedCallback() {
    this.clearFocusInModal();
    if (this.modal) {
      this.modal.hide();
    }
    this.confirmButton?.removeEventListener('click', this._handleConfirm);
    this.cancelButton?.removeEventListener('click', this._handleCancel);
    this.modalElement?.removeEventListener('hide.bs.modal', this.clearFocusInModal);
  }

  render() {
    this.innerHTML = this.template();
    this.modal = new Modal(this.querySelector('.modal'));

    this.modalElement = this.querySelector('.modal');
    this.confirmButton = this.querySelector('.confirm-button');
    this.cancelButton = this.querySelector('.cancel-button');
    this.modalElement.addEventListener('hide.bs.modal', this.clearFocusInModal);
    this.confirmButton.addEventListener('click', this._handleConfirm);
    this.cancelButton.addEventListener('click', this._handleCancel);
  }

  showModal() {
    if (this.modal) {
      this.modal.show();
    }
  }

  clearFocusInModal() {
    if (this.modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  template() {
    return `
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
            <div class="confirmation-message modal-body py-4"></div>
            <div class="modal-footer">
              <button type="button" class="cancel-button btn" data-bs-dismiss="modal"></button>
              <button type="button" class="confirm-button btn btn-danger" data-bs-dismiss="modal"></button>
            </div>
          </div>
      <div>
    </div>
    `;
  }
}

customElements.define('confirmation-modal', ConfirmationModal);
