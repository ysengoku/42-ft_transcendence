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

  // connectedCallback() {
  //   this.render();
  // }

  set contentType(contentType) {
    if (Object.values(this.CONTENT_TYPE).includes(contentType)) {
      this.#state.contentType = contentType;
      switch (this.#state.contentType) {
        case this.CONTENT_TYPE.CANCEL_TOURNAMENT:
          this.modalBody.textContent = 'This will cancel the tournament permanently. Are you sure?';
          this.confirmButton.textContent = 'Yes, cancel tournament';
          this.cancelButton.textContent = 'No, keep tournament';
          break;
        case this.CONTENT_TYPE.UNREGISTER_TOURNAMENT:
          this.modalBody.textContent = 'You will be removed from this tournament. Continue?';
          this.confirmButton.textContent = 'Yes, unregister me';
          this.cancelButton.textContent = "No, stay registered";
          break;
      }
    }
  }

  disconnectedCallback() {
    this.confirmButton?.removeEventListener('click', this.handleConfirmButtonClick);
    this.modalElement?.removeEventListener('hide.bs.modal', this.clearFocusInModal);
  }

  render() {
    this.innerHTML = this.template();
    this.modalElement = this.querySelector('.modal');
    this.modalBody = this.querySelector('.modal-body');
    this.confirmButton = this.querySelector('#tournament-modal-confirm');
    this.cancelButton = this.querySelector('#tournament-modal-cancel');

    if (!this.modalElement) {
      return;
    }
    this.modal = new Modal(this.modalElement);
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
    <div class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body py-4"></div>
          <div class="modal-footer">
            <button type="button" class="btn" data-bs-dismiss="modal" id="tournament-modal-cancel"></button>
            <button type="button" class="btn btn-danger" id="tournament-modal-confirm"></button>
          </div>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-modal', TournamentModal);
