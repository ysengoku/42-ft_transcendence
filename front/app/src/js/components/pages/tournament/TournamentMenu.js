import { Modal } from 'bootstrap';
import './components/index.js';

export class TournamentMenu extends HTMLElement {
  #state = {
    newTournament: null,
    tounamentRegistration: null,
  };

  constructor() {
    super();

    this.showCreateNewTournamentForm = this.showCreateNewTournamentForm.bind(this);
    this.showTournamentDetail = this.showTournamentDetail.bind(this);
    this.toggleRequiredParticipants = this.toggleRequiredParticipants.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.createTournamentButton?.removeEventListener('click', this.showCreateNewTournamentForm);
    this.list?.removeEventListener('register-tournament', this.showTournamentDetail);
    this.noOpenTournaments?.removeEventListener('click', this.showCreateNewTournamentForm);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();

    this.createTournamentButton = this.querySelector('#create-tournament-button');
    this.list = this.querySelector('tournament-list');
    
    this.createTournamentButton.addEventListener('click', this.showCreateNewTournamentForm);
    this.list.addEventListener('click', this.showTournamentDetail);

    const modalTemplate = document.createElement('template');
    modalTemplate.innerHTML = this.modalTemplate();
    this.modalComponent = modalTemplate.content.querySelector('.modal');
    document.body.appendChild(this.modalComponent);
    this.modal = new Modal(this.modalComponent);
    this.modalBody = this.modalComponent.querySelector('.modal-body');
    this.modalFooter = this.modalComponent.querySelector('.modal-footer');

    window.requestAnimationFrame(() => {
      this.noOpenTournaments = document.getElementById('no-open-tournaments');
      this.noOpenTournaments?.addEventListener('click', this.showCreateNewTournamentForm);
    });
  }

  tournamentDetail = {
    lobby: () => {
      this.modalBody.innerHTML = this.registerForTournamentForm();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modalTournamentStatus = this.modalBody.querySelector('.modal-tournament-status');
      modalTitle.textContent = this.tournamentName;
      modalTournamentStatus.textContent = 'Open for entries';
  
      const confirmButton = this.modalFooter.querySelector('.confirm-button');
      confirmButton.textContent = 'Register';
    },
    ongoing: () => {
    },
    finished: () => {
    },
    cancelled: () => {
    }
  };

  /* ------------------------------------------------------------------------ */
  /*      New tournament                                                      */
  /* ------------------------------------------------------------------------ */
  showCreateNewTournamentForm() {
    console.log('Create new tournament');
    this.modalBody.innerHTML = '';

    this.modalBody.innerHTML = this.createTournamentForm();
    const confirmButton = this.modalFooter.querySelector('.confirm-button');
    confirmButton.textContent = 'Create';

    this.tounamentNameInput = this.modalBody.querySelector('#tournament-name');
    this.requiredParticipant4 = this.modalBody.querySelector('#required-participants-4');
    this.requiredParticipant8 = this.modalBody.querySelector('#required-participants-8');

    this.requiredParticipant4.addEventListener('click', this.toggleRequiredParticipants);
    this.requiredParticipant8.addEventListener('click', this.toggleRequiredParticipants);

    this.modal.show();
  }

  toggleRequiredParticipants(event) {
    const selectedValue = event.target.value;
    console.log('Selected value:', selectedValue);
  }

  /* ------------------------------------------------------------------------ */
  /*      Existing tournaments                                                */
  /* ------------------------------------------------------------------------ */
  showTournamentDetail(event) {
    const listItem = event.target.closest('li[tournament-id]');
    if (!listItem || !listItem.hasAttribute('tournament-id')) {
      return;
    }
    this.tournamentId = listItem.getAttribute('tournament-id');
    this.tournamentName = listItem.getAttribute('tournament-name');
    const tournamentStatus = listItem.getAttribute('tournament-status');
    if (!this.tournamentId || !this.tournamentName || !tournamentStatus) {
      return;
    }
    this.modalBody.innerHTML = '';
    this.tournamentDetail[tournamentStatus]();
    this.modal.show();
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
          <div class="modal-footer border-0 my-2">
            <button type="button" class="cancel-button btn" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder fs-5" data-bs-dismiss="modal"></button>
          </div>
        <div>
      </div>
    </div>
    `;  
  }

  createTournamentForm() {
    return `
    <style>
    .btn-outline-create-tournament {
      border: 1px solid rgba(var(--bs-body-color-rgb), 0.4);
      color: rgba(var(--bs-body-color-rgb), 0.6);
    }
    .btn-check:checked + .btn-outline-create-tournament,
    .btn-check:active + .btn-outline-create-tournament,
    .btn-outline-create-tournament.active {
      color: var(--pm-primary-100);
      font-weight: 600;
      background-color: var(--pm-primary-500);
      border-color: var(--pm-primary-500);
    }
    </style>
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center pb-4">Create a tournament</h2>
      <div id="create-tournament-form" class="d-flex flex-column w-100 gap-2">
        <div class="mb-3">
          <label for="tournament-name" class="form-label">Tournament name</label>
          <input type="text" class="form-control" id="tournament-name" placeholder="Tournament name" minlength="3" maxlength="50" required>
          <div class="invalid-feedback" id="tournament-name-feedback"></div>
        </div>
        <div class="d-flex flex-column mb-3">
          <label class="mb-2">Number of participants</label>
          <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="requiredParticipants" id="required-participants-4" value="4" autocomplete="off" checked>
            <label class="btn btn-outline-create-tournament py-0" for="required-participants-4">4</label>

            <input type="radio" class="btn-check" name="requiredParticipants" id="required-participants-8" value="8" autocomplete="off">
            <label class="btn btn-outline-create-tournament py-0" for="required-participants-8">8</label>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  registerForTournamentForm() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="modal-tournament-status text-center"></p>
      <div id="tournament-register-form" class="d-flex flex-column w-100 gap-2">
        <div class="mb-3">
          <label for="tournament-alias" class="form-label">Tournament name</label>
          <input type="text" class="form-control" id="tournament-alias" placeholder="Enter your alias" minlength="1" maxlength="12" required>
          <div class="invalid-feedback" id="tournament-alias-feedback"></div>
        </div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-menu', TournamentMenu);
