import { Modal } from 'bootstrap';
import { router } from '@router';
import { auth } from '@auth';
import { formatDateMDY } from '@utils';
import './components/index.js';

export class TournamentMenu extends HTMLElement {
  #maxAliasLength = Number(import.meta.env.VITE_MAX_ALIAS_LENGTH) || 12;

  constructor() {
    super();

    this.createTournamentButton = null;
    this.list = null;
    this.selectedTournament = null;
    this.noOpenTournaments = null;

    this.modalComponent = null;
    this.modal = null;
    this.modalBody = null;
    this.modalFooter = null;
    this.calcelButton = null;
    this.confirmButton = null;
    this.aliasInput = null;
    this.aliasInputFeedback = null;
    this.registrationFailFeedback = null;

    this.showNewTournamentForm = this.showNewTournamentForm.bind(this);
    this.showTournamentDetail = this.showTournamentDetail.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleAliasInput = this.handleAliasInput.bind(this);
    this.confirmRegister = this.confirmRegister.bind(this);
    this.navigateToOverview = this.navigateToOverview.bind(this);
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 401) {
        router.navigate('/login');
      }
      return;
    }
    // authStatus.response.tournament_id = '1234'; // For test
    if (authStatus.response.tournament_id) {
      this.redirectToActiveTournament(authStatus.response.tournament_id);
      return;
    }
    this.render();
  }

  disconnectedCallback() {
    this.createTournamentButton?.removeEventListener('click', this.showNewTournamentForm);
    this.list?.removeEventListener('register-tournament', this.showTournamentDetail);
    this.noOpenTournaments?.removeEventListener('click', this.showNewTournamentForm);
    document.removeEventListener('hide-modal', this.hideModal);
    this.modalComponent.removeEventListener('hide.bs.modal', this.handleCloseModal);
    if (this.selectedTournament && this.selectedTournament.staus !== 'pending') {
      this.confirmButton?.removeEventListener('click', this.navigateToOverview);
    }
  }

  redirectToActiveTournament(id) {
    devLog('Active tournament session found. Redirect to the tournament', id);
    const modalTemplate = document.createElement('template');
    modalTemplate.innerHTML = this.modalTemplate();
    const modalHeader = modalTemplate.content.querySelector('.modal-header');
    const modalBody = modalTemplate.content.querySelector('.modal-body');
    modalBody.innerHTML = this.redirectToOngoingTournamentTemplate();
    const modalFooter = modalTemplate.content.querySelector('.modal-footer');
    modalHeader.classList.add('d-none');
    modalFooter.classList.add('d-none');
    this.modalComponent = modalTemplate.content.querySelector('.modal');
    document.body.appendChild(this.modalComponent);
    this.modal = new Modal(this.modalComponent);

    this.modal.show();
    setTimeout(() => {
      this.modal.hide();
      router.navigate(`/tournament/${id}`);
    }, 3000);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

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
    this.confirmButton.classList.remove('d-none');
    this.confirmButton.disabled = true;
    this.calcelButton.textContent = 'Cancel';

    this.aliasInput?.removeEventListener('input', this.handleAliasInput);
    this.confirmButton.removeEventListener('click', this.confirmRegister);
    this.confirmButton.removeEventListener('click', this.navigateToOverview);

    this.aliasInput = null;
    this.aliasInputFeedback = null;
  }

  showNewTournamentForm() {
    this.modalBody.innerHTML = '';
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
    const tournamentId = listItem.getAttribute('tournament-id');
    this.selectedTournament = this.list.getTournamentById(tournamentId);
    const tournamentStatus = this.selectedTournament.status;
    if (!tournamentId || !tournamentStatus) {
      return;
    }
    this.modalBody.innerHTML = '';
    console.log('Selected tournament:', this.selectedTournament);
    this.tournamentDetail[tournamentStatus]();
    this.modal.show();
  }

  tournamentDetail = {
    pending: () => {
      this.modalBody.innerHTML = this.registerTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modatRequiredParticipants = this.modalBody.querySelector('#modal-required-participants');
      modalTitle.textContent = this.selectedTournament.name;
      modatRequiredParticipants.textContent = `${this.selectedTournament.participants_count} / ${this.selectedTournament.required_participants}`;

      this.aliasInput = this.modalBody.querySelector('#tournament-alias');
      this.aliasInputFeedback = this.modalBody.querySelector('#tournament-alias-feedback');
      this.registrationFailFeedback = this.modalBody.querySelector('#registration-fail-feedback');
      this.aliasInput.addEventListener('input', this.handleAliasInput);

      this.confirmButton.textContent = 'Register';
      this.confirmButton.addEventListener('click', this.confirmRegister);
    },
    ongoing: () => {
      this.modalBody.innerHTML = this.ongoingTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      modalTitle.textContent = this.selectedTournament.name;

      this.confirmButton.textContent = 'Check progress';
      this.confirmButton.disabled = false;
      this.confirmButton.addEventListener('click', this.navigateToOverview);
      this.calcelButton.textContent = 'Close';
    },
    finished: () => {
      this.modalBody.innerHTML = this.finishedTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modalTournamentStatus = this.modalBody.querySelector('#modal-tournament-status');
      const tournamentWinnerAvatar = this.modalBody.querySelector('#tournament-winner-avatar');
      const tournamentWinnerAlias = this.modalBody.querySelector('#tournament-winner-alias');
      modalTitle.textContent = this.selectedTournament.name;
      modalTournamentStatus.textContent = `Finished on ${formatDateMDY(this.selectedTournament.date)}`;
      if (this.selectedTournament.winner && this.selectedTournament.winner.user &&
        this.selectedTournament.winner.user.avatar) {
        tournamentWinnerAvatar.src = this.selectedTournament.winner.user.avatar;
      } else {
        tournamentWinnerAvatar.classList.add('d-none');
      }
      tournamentWinnerAlias.textContent = this.selectedTournament.winner ?
        this.selectedTournament.winner.alias :
        'Data not available';

      this.confirmButton.textContent = 'View Results';
      this.confirmButton.disabled = false;
      this.confirmButton.addEventListener('click', this.navigateToOverview);
      this.calcelButton.textContent = 'Close';
    },
  };

  handleAliasInput(event) {
    if (event.target.value.length < 1) {
      this.aliasInput.classList.add('is-invalid');
      this.aliasInputFeedback.textContent = `Alias cannot be empty`;
      this.confirmButton.disabled = true;
    } else if (event.target.value.length > this.#maxAliasLength) {
      this.aliasInput.classList.add('is-invalid');
      this.aliasInputFeedback.textContent = `Alias must be less than ${this.#maxAliasLength} characters.`;
      this.confirmButton.disabled = true;
    } else {
      this.aliasInput.classList.remove('is-invalid');
      this.aliasInputFeedback.textContent = '';
      this.confirmButton.disabled = false;
    }
  }

  confirmRegister(event) {
    event.stopPropagation();

    // Send API request to register for the tournament
    devLog('Registering for tournament:', this.selectedTournament.id, this.aliasInput.value);

    // For tetst
    // const response = {
    //   success: true,
    //   data: {
    //     id: this.selectedTournament.id,
    //   },
    // }
    const response = {
      success: false,
      data: {
        reason: 'The alias is already taken.',
      },
    };

    if (response.success) {
      this.modal.hide();
      this.connectToTournamentRoom();
    } else {
      // TODO: Handle registration failure
      const reason = response.data.reason; // For Test (Need to adjust to the server implementation)

      this.registrationFailFeedback.classList.remove('d-none');
      this.registrationFailFeedback.textContent = reason;
      // this.handleRegistrationFail[reason]();
    }
  }

  connectToTournamentRoom() {
    this.modal.hide();
    router.navigate(`/tournament/${this.selectedTournament.id}`);
  }

  // handleRegistrationFail = {
  //   duplicateAlias: () => {
  //     // const this.aliasInputFeedback = this.modalBody.querySelector('#tournament-alias-feedback');
  //     // this.aliasInputFeedback.textContent = `Alias is already taken.`;
  //     // aliasInput.classList.add('is-invalid');
  //   },
  //   full: () => {
  //     // TODO: Show message tournament is full
  //     this.modal.hide();
  //     this.list.render();
  //   }
  // }

  navigateToOverview() {
    this.modal.hide();
    router.navigate(`/tournament-overview/${this.selectedTournament.id}`);
  }

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
              Back to Saloon
            </a>
          </div>
        </div>
      </div>
    </div>
		`;
  }

  style() {
    return `
    <style>
    .modal-content {
      color: var(--pm-primary-100);
      button {
        color: var(--pm-primary-100);
      }
      button:disabled {
        color: rgba(var(--pm-primary-100-rgb), 0.5);
        border: none;
      }
    }
    .modal-title {
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    #modal-tournament-status {
      color: var(--pm-green-200);
    }
    .invalid-feedback {
      color: var(--pm-red-300) !important;
    }
    #registration-fail-feedback {
      background-color: var(--pm-red-400);
      border-radius: 0.25rem;
    }
    </style>
    `;
  }

  modalTemplate() {
    return `
    <div class="modal fade mt-5" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog pt-4">
        <div class="modal-content wood-board">
          <div class="modal-header border-0">
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer border-0 my-2 px-3">
            <button type="button" class="cancel-button btn me-3" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder ms-2" disabled></button>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  registerTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4 w-100">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center fs-6 m-0" id="modal-tournament-status">Open for entries</p>
      <div class="d-flex flex-row justify-content-center align-items-center mb-5 pb-2 gap-2">
        <p class="text-center fs-4 m-0" id="modal-required-participants"></p>
        <p class="text-center fs-6 m-0 pe-1">players</p>
      </div>
      <div class="mb-2 px-3 py-2 d-none w-75" role="alert" id="registration-fail-feedback"></div>
      <div id="tournament-register-form" class="d-flex flex-column w-100 mb-3">
        <label for="tournament-alias" class="form-label">Set your tournament alias</label>
        <input type="text" class="form-control" id="tournament-alias" placeholder="Your alias for the tournament" autocomplete="off" required>
        <div class="invalid-feedback" id="tournament-alias-feedback"></div>
      </div>
    </div>
    `;
  }

  ongoingTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-tournament-status">Ongoing</p>
      <p class="text-center mt-3">This tournament is ongoing. You can not register.</p>
    </div>
    `;
  }

  finishedTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-tournament-status"></p>
      <div class="d-flex flex-column align-items-center mt-4">
        <h3 class="text-center mt-3">Champion</h3>
        <img class="avatar-m rounded-circle" id="tournament-winner-avatar" alt="champion-avatar">
        <p class="fs-5" id="tournament-winner-alias"></p>
      </div>
    </div>
    `;
  }

  redirectToOngoingTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <p class="text-center m-0 mt-3">You have an active tournament session.</p>
      <p class="text-center m-0 mb-3">Taking you there now!</p>
    </div>
    `;
  }
}

customElements.define('tournament-menu', TournamentMenu);
