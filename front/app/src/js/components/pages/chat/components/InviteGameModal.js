import { Modal } from 'bootstrap';
import { router } from '@router';	
import { socketManager } from "@socket";

export class InviteGameModal extends HTMLElement {
  #state = {
    opponent: null,
    options: null,
  }

  constructor() {
    super();
    this.modal = null;
	this.modalElement = null;
    
    this.gameOptionsForm = null;
    this.inviteButton = null;
	this.cancelButton = null;
	this.closeButton = null;

    this.sendInvitation = this.sendInvitation.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  disconnectedCallback() {
	this.inviteButton?.removeEventListener('click', this.sendInvitation);
	this.cancelButton?.removeEventListener('click', this.closeModal);
	this.closeButton?.removeEventListener('click', this.closeModal);
	this.modal?.dispose();
  }

  render() {
    this.innerHTML = this.template();

	this.modalElement = this.querySelector('.modal');
    this.gameOptionsForm = this.querySelector('game-options');
	this.inviteButton = this.querySelector('.confirm-button');
	this.cancelButton = this.querySelector('.cancel-button');
	this.closeButton = this.querySelector('.btn-close');
    this.inviteButton.addEventListener('click', this.sendInvitation);
	this.cancelButton.addEventListener('click', this.closeModal);
	this.closeButton.addEventListener('click', this.closeModal);

	const anyOptions = this.gameOptionsForm.querySelectorAll('.opt-out-option');
    anyOptions.forEach((item) => {
      item.classList.add('d-none');
    });

    if (this.#state.options) {
      this.gameOptionsForm.selectedOptions = this.#state.options;
    }
    this.modal = new Modal(this.querySelector('.modal'));
  }

  showModal(opponent) {
	console.log('Showing invite game modal for:', opponent);
    this.#state.opponent = opponent;
    this.render();
    this.modal.show();
  }

  closeModal() {
    if (this.modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.modal.hide();
  }

  sendInvitation() {
    const message = {
      action: 'invite_game',
      data: {
        username: this.#state.opponent.username,
        options: this.gameOptionsForm.selectedOptions,
      },
    }
    socketManager.sendMessage('livechat', message);
    const queryParams = {
      status: 'inviting',
      username: this.#state.opponent.username,
      nickname: this.#state.opponent.nickname,
      avatar: this.#state.opponent.avatar,
    };
    this.modalElement.addEventListener(
      'hidden.bs.modal', () => {
        router.navigate('/duel', queryParams);
      }, { once: true }
    );
	this.closeModal();
  }

  template() {
    return `
    <div class="modal fade mt-2" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content wood-board">
          <div class="modal-header border-0">
            <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body"><game-options></game-options></div>
          <div class="modal-footer border-0 mt-3">
            <button type="button" class="cancel-button btn" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder fs-5" data-bs-dismiss="modal">Send invitation</button>
          </div>
        </div>
      <div>
    </div>
    `;
  }
}

customElements.define('invite-game-modal', InviteGameModal);
