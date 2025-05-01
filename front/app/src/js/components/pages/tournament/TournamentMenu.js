import { Modal } from 'bootstrap';
import './components/index.js';

export class TournamentMenu extends HTMLElement {
  // #maxAliasLength = Number(import.meta.env.VITE_MAX_ALIAS_LENGTH) || 12;

  // #state = {
    // tounamentRegistration: {
    //   alias: '',
    //   tournamentId: '',
    // },
  //   modalType: '', // 'create' | 'register'
  // };

  constructor() {
    super();

    this.showNewTournamentForm = this.showNewTournamentForm.bind(this);
    this.showTournamentDetail = this.showTournamentDetail.bind(this);
    // this.handleAliasInput = this.handleAliasInput.bind(this);
    // this.confirmRegister = this.confirmRegister.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.createTournamentButton?.removeEventListener('click', this.showNewTournamentForm);
    this.list?.removeEventListener('register-tournament', this.showTournamentDetail);
    this.noOpenTournaments?.removeEventListener('click', this.showNewTournamentForm);
    document.removeEventListener('hide-modal', this.hideModal);
    this.modalComponent.removeEventListener('hide.bs.modal', this.handleCloseModal);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();

    this.createTournamentButton = this.querySelector('#create-tournament-button');
    this.list = this.querySelector('tournament-list');
    
    this.createTournamentButton.addEventListener('click', this.showNewTournamentForm);
    this.list.addEventListener('click', this.showTournamentDetail);

    const modalTemplate = document.createElement('template');
    modalTemplate.innerHTML = this.modalTemplate();
    this.modalComponent = modalTemplate.content.querySelector('.modal');
    document.body.appendChild(this.modalComponent);
    this.modal = new Modal(this.modalComponent);
    this.modalBody = this.modalComponent.querySelector('.modal-body');
    this.modalFooter = this.modalComponent.querySelector('.modal-footer');
    this.calcelButton = this.modalFooter.querySelector('.cancel-button');
    this.confirmButton = this.modalFooter.querySelector('.confirm-button');

    document.addEventListener('hide-modal', this.hideModal);
    this.modalComponent.addEventListener('hide.bs.modal', this.handleCloseModal);
    window.requestAnimationFrame(() => {
      this.noOpenTournaments = document.getElementById('no-open-tournaments');
      this.noOpenTournaments?.addEventListener('click', this.showNewTournamentForm);
    });
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  hideModal() {
    this.modal.hide();
  }

  handleCloseModal() {
    if (this.modalComponent.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    this.modalBody.innerHTML = '';
    // this.#state.modalType = '';
    // if (this.#state.modalType === 'create') {
    //   this.tournamentNameInput?.removeEventListener('input', this.handleTournamentInputName);
    //   this.confirmButton?.removeEventListener('click', this.createTournament);
    // }
    // if (this.#state.modalType === 'register') {
    //   this.aliasInput?.removeEventListener('input', this.handleAliasInput);
    //   this.confirmButton?.removeEventListener('click', this.confirmRegister);
    // }
  }

  showNewTournamentForm() {
    this.modalBody.innerHTML = '';
    // this.#state.modalType = 'create';

    const modalBodyContent = document.createElement('tournament-creation');
    this.modalBody.appendChild(modalBodyContent);
    this.confirmButton.textContent = 'Create';

    this.modal.show();
  }

  showTournamentDetail(event) {
    const listItem = event.target.closest('li[tournament-id]');
    if (!listItem || !listItem.hasAttribute('tournament-id')) { 
      return;
    }
    this.tournamentId = listItem.getAttribute('tournament-id');
    this.selectedTournament = this.list.getTournamentById(this.tournamentId);
    const tournamentStatus = this.selectedTournament.status;
    if (!this.tournamentId  || !tournamentStatus) {
      return;
    }
    this.modalBody.innerHTML = '';
    this.tournamentDetail[tournamentStatus]();
    this.modal.show();
  }


  tournamentDetail = {
    lobby: () => {
      // this.#state.modalType = 'register';
      const modalBodyContent = document.createElement('tournament-registration');
      modalBodyContent.data = this.selectedTournament;
      this.modalBody.appendChild(modalBodyContent);
      // this.modalBody.innerHTML = this.registerForTournamentForm();
      // const modalTitle = this.modalBody.querySelector('.modal-title');
      // const modalTournamentStatus = this.modalBody.querySelector('#modal-tournament-status');
      // const modalRequiredParticipants = this.modalBody.querySelector('#modal-required-participants');
      // modalTitle.textContent = this.selectedTournament.tournament_name;
      // modalTournamentStatus.textContent = 'Open for entries';

      // this.aliasInput = this.modalBody.querySelector('#tournament-alias');
      // this.aliasInput.addEventListener('input', this.handleAliasInput);
  
      // this.confirmButton.textContent = 'Register';
      // this.confirmButton.addEventListener('click', this.confirmRegister);
    },
    ongoing: () => {
    },
    finished: () => {
    },
    cancelled: () => {
    }
  };

  // handleAliasInput(event) {
  //   const tournamentAlias = this.modalBody.querySelector('#tournament-alias');
  //   const tournamentAliasFeedback = this.modalBody.querySelector('#tournament-alias-feedback');
  //   if (event.target.value.length < 1) {
  //     tournamentAlias.classList.add('is-invalid');
  //     tournamentAliasFeedback.textContent = `Alias cannot be empty`;
  //     this.confirmButton.disabled = true;
  //   } else if (event.target.value.length > this.#maxAliasLength) {
  //     tournamentAlias.classList.add('is-invalid');
  //     tournamentAliasFeedback.textContent = `Alias must be less than ${this.#maxAliasLength} characters.`;
  //     this.confirmButton.disabled = true;
  //   } else {
  //     tournamentAlias.classList.remove('is-invalid');
  //     tournamentAliasFeedback.textContent = '';
  //     this.confirmButton.disabled = false;
  //   }
  // }

  // confirmRegister(event) {
  //   event.stopPropagation();
  //   this.#state.tounamentRegistration.tournamentId = this.tournamentId;
  //   this.#state.tounamentRegistration.alias = this.aliasInput.value;

  //   socketManager.openSocket('tournament', this.#state.tounamentRegistration.tournamentId);
  //   const data = {
  //     action: 'register',
  //     data: { alias: this.#state.tounamentRegistration.alias },
  //   }
  //   socketManager.sendMessage('tournament', data);
  //   console.log('Registering for tournament:', data);

  //   // If receive registered message
  //   // Navigate to tournament page
  //   this.modal.hide();
  //   // Else if the tournmant is full, show message

  // }
    
  // connectToTournamentRoom(event) {

  // }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="container">
      <div class="row justify-content-center py-4">
        <div class="form-container col-12 col-sm-12 col-lg-10 col-xl-6 p-4">
          <div class="d-flex flex-column justify-content-center align-items-center w-100 px-4">
            <h2 class="text-start m-0 py-2 w-100">Tournament</h2>
            <button class="btn d-flex flex-row justify-content-start align-items-center fw-bold w-100 m-0 p-0 mb-3" id="create-tournament-button">
              <i class="bi bi-plus fs-3 pt-1"></i>
              <p class="fs-5 m-0">New Tournament</p>
            </button>

            <div class="pb-4 w-100">
              <tournament-list></tournament-list>
            </div>

            <a href="/home" class="btn">
              <i class="bi bi-arrow-left"></i>
              Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
		`;
  }

  modalTemplate() {
    return `
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content">
          <div class="modal-header border-0">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer border-0 my-2 px-4">
            <button type="button" class="cancel-button btn" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn btn-wood fw-bolder fs-5" disabled></button>
          </div>
        </div>
      </div>
    </div>
    `;  
  }

  // registerForTournamentForm() {
  //   return `
  //   <div class="d-flex flex-column align-items-center px-4">
  //     <h2 class="modal-title text-center"></h2>
  //     <p class="text-center" id="modal-tournament-status"></p>
  //     <p class="text-center" id="modal-required-participants"></p>
  //     <div id="tournament-register-form" class="d-flex flex-column w-100 gap-2">
  //       <div class="mb-3">
  //         <label for="tournament-alias" class="form-label">Tournament Alias</label>
  //         <input type="text" class="form-control" id="tournament-alias" placeholder="Your alias for the tournament" required>
  //         <div class="invalid-feedback" id="tournament-alias-feedback"></div>
  //       </div>
  //     </div>
  //   </div>
  //   `;
  // }
}

customElements.define('tournament-menu', TournamentMenu);
