import { Modal } from 'bootstrap';

export class TournamentModal extends HTMLElement {
  CONTENT_TYPE = {
    CANCEL_TOURNAMENT: 'cancelTournament',
    UNREGISTER_TOURNAMENT: 'unregisterTournament',
  };

  #state = {
    contentType: '',
  };

  constructor() {
    super();
    this.modal = null;
    this.modalElement = null;
    this.modalBody = null;
    this.confirmButton = null;

    this.clearFocusInModal = this.clearFocusInModal.bind(this);
    this.handleConfirmButtonClick = this.handleConfirmButtonClick.bind(this);
  }

  set contentType(contentType) {
    if (Object.values(this.CONTENT_TYPE).includes(contentType)) {
      this.#state.contentType = contentType;
      this.render();
    }
  }

  disconnectedCallback() {
    this.confirmButton?.removeEventListener('click', this.handleConfirmButtonClick);
    this.modalElement?.removeEventListener('hide.bs.modal', this.clearFocusInModal);
  }

  render() {
    this.innerHTML = this.template();
    if (this.modal) {
      this.modal.dispose();
    }
    this.modal = new Modal(this.querySelector('.modal'));

    this.modalElement = this.querySelector('.modal');
    this.modalBody = this.querySelector('.modal-body');
    this.confirmButton = this.querySelector('#tournament-modal-confirm');

    switch (this.#state.contentType) {
      case this.CONTENT_TYPE.CANCEL_TOURNAMENT:
        this.modalBody.textContent = 'Are you sure you want to cancel the tournament?';
        this.confirmButton.textContent = 'Cancel tournament';
        this.confirmButton.classList.add('btn-danger');
        break;
      case this.CONTENT_TYPE.UNREGISTER_TOURNAMENT:
        this.modalBody.textContent = 'Are you sure you want to unregister from the tournament?';
        this.confirmButton.textContent = 'Unregister';
        this.confirmButton.classList.add('btn-danger');
        break;
    }

    this.modalElement.addEventListener('hide.bs.modal', this.clearFocusInModal);
    this.confirmButton.addEventListener('click', this.handleConfirmButtonClick);
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

  handleConfirmButtonClick() {
    const customEvent = new CustomEvent('tournament-modal-confirm', {
      detail: { contentType: this.#state.contentType },
      bubbles: true,
    });
    this.modal.hide();
    this.dispatchEvent(customEvent);
  }

  template() {
    return `
    <div class="modal fade" id="delete-account-confirm-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body py-4"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="tournament-modal-confirm"></button>
          </div>
        </div>
      <div>
    </div>
    `;
  }
}

customElements.define('tournament-modal', TournamentModal);
