import { Modal } from 'bootstrap';
import { router } from '@router';
import { auth } from '@auth';
import { formatDateMDY } from '@utils';
import './components/index.js';

export class TournamentMenu extends HTMLElement {
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

    this.showNewTournamentForm = this.showNewTournamentForm.bind(this);
    this.showTournamentDetail = this.showTournamentDetail.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.navigateToOverview = this.navigateToOverview.bind(this);
  }

  async connectedCallback() {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
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
    if (this.selectedTournament && this.selectedTournament.staus !== 'lobby') {
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
    if (!tournamentId  || !tournamentStatus) {
      return;
    }
    this.modalBody.innerHTML = '';
    this.tournamentDetail[tournamentStatus]();
    this.modal.show();
  }

  tournamentDetail = {
    lobby: () => {
      const modalBodyContent = document.createElement('tournament-registration');
      modalBodyContent.data = this.selectedTournament;
      this.modalBody.appendChild(modalBodyContent);
    },
    ongoing: () => {
      this.modalBody.innerHTML = this.ongoingTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modalRequiredParticipants = this.modalBody.querySelector('#modal-required-participants');
      modalTitle.textContent = this.selectedTournament.tournament_name;
      modalRequiredParticipants.textContent = `${this.selectedTournament.participants_count} / ${this.selectedTournament.required_participants} players`;

      this.confirmButton.textContent = 'Check progress';
      this.confirmButton.disabled = false;
      this.confirmButton.addEventListener('click', this.navigateToOverview);
      this.calcelButton.textContent = 'Close';
    },
    finished: () => {
      this.modalBody.innerHTML = this.finishedTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modalRequiredParticipants = this.modalBody.querySelector('#modal-required-participants');
      const modalTournamentStatus = this.modalBody.querySelector('#modal-tournament-status');
      const tournamentWinnerAvatar = this.modalBody.querySelector('#tournament-winner-avatar');
      const tournamentWinnerAlias = this.modalBody.querySelector('#tournament-winner-alias');
      modalTitle.textContent = this.selectedTournament.tournament_name;
      modalRequiredParticipants.textContent = `${this.selectedTournament.participants_count} / ${this.selectedTournament.required_participants} players`;
      modalTournamentStatus.textContent = `Finished on ${formatDateMDY(this.selectedTournament.date)}`;
      tournamentWinnerAvatar.src = this.selectedTournament.winner.user.avatar;
      tournamentWinnerAlias.textContent = this.selectedTournament.winner.alias;

      this.confirmButton.textContent = 'View Results';
      this.confirmButton.disabled = false;
      this.confirmButton.addEventListener('click', this.navigateToOverview);
      this.calcelButton.textContent = 'Close';
    },
  };

  navigateToOverview() {
    this.modal.hide();
    router.navigate(`/tournament-overview/${this.selectedTournament.tournament_id}`);
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

  style() {
    return `
    <style>
    .modal-title {
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    </style>
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
          <div class="modal-footer border-0 my-2 px-5">
            <button type="button" class="cancel-button btn me-3" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="confirm-button btn fw-bolder ms-2" disabled></button>
          </div>
        </div>
      </div>
    </div>
    `;  
  }

  ongoingTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-required-participants"></p>
      <p class="text-center mt-3">This tournament is ongoing. You can not register.</p>
    </div>
    `;
  }

  finishedTournamentTemplate() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-required-participants"></p>
      <p class="text-center" id="modal-tournament-status"></p>
      <div class="d-flex flex-column align-items-center mt-4">
        <h3 class="text-center mt-3">Winner</h3>
        <img class="avatar-m rounded-circle" id="tournament-winner-avatar" alt="Winner's avatar">
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
