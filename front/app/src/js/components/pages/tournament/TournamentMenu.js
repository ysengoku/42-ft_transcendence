/**
 * @module TournamentMenu
 * @description
 * TournamentMenu component, which displays tournaments list, filtered by ongoing or all tournaments.
 * It allows users to create new tournaments, show preview of existing tournaments,
 * and register for tournaments.
 */

import { Modal } from 'bootstrap';
import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE, sessionExpiredToast } from '@utils';
import { formatDateMDY } from '@utils';
import { validateTournamentAlias } from './index';

export class TournamentMenu extends HTMLElement {
  /**
   * Private state of the component.
   * @property {Object} #state
   * @property {string} #state.nickname - User's nickname.
   * @property {boolean} #state.canEngage - Indicates if the user can engage in tournaments.
   */
  #state = {
    nickname: '',
    canEngage: false,
  };

  constructor() {
    super();

    // Initialize references to DOM elements
    this.createTournamentButton = null;
    this.list = null;
    this.selectedTournament = null;
    this.noOpenTournaments = null;

    this.modalComponent = null;
    this.modal = null;
    this.modalBody = null;
    this.modalFooter = null;
    this.cancelButton = null;
    this.confirmButton = null;
    this.aliasInput = null;
    this.aliasInputFeedback = null;
    this.registrationFailFeedback = null;

    // Bind event handlers
    this.showTournamentCreationForm = this.showTournamentCreationForm.bind(this);
    this.showTournamentDetail = this.showTournamentDetail.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.validateAliasInput = this.validateAliasInput.bind(this);
    this.confirmRegister = this.confirmRegister.bind(this);
    this.navigateToOverview = this.navigateToOverview.bind(this);
  }

  /**
   * Lifecycle method called when the component is connected to the DOM.
   * It checks the authentication status and redirects the user accordingly.
   * If the user is authenticated and has an active tournament session, it redirects to that tournament.
   */
  async connectedCallback() {
    const loading = document.createElement('loading-animation');
    this.innerHTML = loading.outerHTML;
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      if (authStatus.status === 429) {
        return;
      }
      if (authStatus.status === 401) {
        sessionExpiredToast();
      }
      router.redirect('/login');
      return;
    }
    if (authStatus.response.tournament_id) {
      router.redirect(`/tournament/${authStatus.response.tournament_id}`);
      return;
    }
    this.#state.nickname = authStatus.response.nickname;
    this.render();
    this.setUpModal();
  }

  disconnectedCallback() {
    this.createTournamentButton?.removeEventListener('click', this.showTournamentCreationForm);
    this.list?.removeEventListener('register-tournament', this.showTournamentDetail);
    this.modalComponent?.removeEventListener('hide.bs.modal', this.handleCloseModal);
    if (this.modal) {
      this.modal.hide();
      Promise.resolve().then(() => {
        this.modal?.dispose();
      });
      if (this.modalComponent && document.body.contains(this.modalComponent)) {
        document.body.removeChild(this.modalComponent);
      }
      this.modalComponent = null;
      this.modal = null;
    }
    if (this.selectedTournament && this.selectedTournament.status !== 'pending') {
      this.confirmButton?.removeEventListener('click', this.navigateToOverview);
    }
    if (document.activeElement && this.modalComponent?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */

  /**
   * Render tournament list (pending tournaments by default) and the create tournament button.
   * It also sets up the modal for tournament creation and detail viewing.
   * @returns {void}
   */
  render() {
    this.innerHTML = '';
    this.innerHTML = this.style() + this.template();

    this.createTournamentButton = this.querySelector('#create-tournament-button');
    this.list = this.querySelector('tournament-list');
    this.createTournamentButton.addEventListener('click', this.showTournamentCreationForm);
    this.list.addEventListener('click', this.showTournamentDetail);
  }

  /* ------------------------------------------------------------------------ */
  /*      Modal set up and rendering                                          */
  /* ------------------------------------------------------------------------ */
  setUpModal() {
    const modalTemplate = document.createElement('template');
    modalTemplate.innerHTML = this.modalTemplate();
    this.modalComponent = modalTemplate.content.querySelector('.modal');
    document.body.appendChild(this.modalComponent);
    this.modal = new Modal(this.modalComponent);
    this.modalBody = this.modalComponent.querySelector('.modal-body');
    this.modalFooter = this.modalComponent.querySelector('.modal-footer');
    this.cancelButton = this.modalFooter.querySelector('.cancel-button');
    this.confirmButton = this.modalFooter.querySelector('.confirm-button');

    this.modalComponent.addEventListener('hide.bs.modal', this.handleCloseModal);
  }

  /**
   * Generate the tournament detail view based on the tournament status.
   * It updates the modal body with the appropriate content and sets up event listeners.
   */
  tournamentDetail = {
    pending: () => {
      this.modalBody.innerHTML = this.registerTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modatRequiredParticipants = this.modalBody.querySelector('#modal-required-participants');
      const tournamentOptionScoreToWin = this.modalBody.querySelector('#tournament-option-score-to-win');
      const tournamentOptionGameSpeed = this.modalBody.querySelector('#tournament-option-game-speed');
      const tournamentOptionTimeLimit = this.modalBody.querySelector('#tournament-option-time-limit');
      const tournamentOptionCoolMode = this.modalBody.querySelector('#tournament-option-cool-mode');

      modalTitle.textContent = this.selectedTournament.name;
      modatRequiredParticipants.textContent = `${this.selectedTournament.participants_count} / ${this.selectedTournament.required_participants}`;

      if (this.selectedTournament.settings.score_to_win) {
        tournamentOptionScoreToWin.textContent = `Score to win: ${this.selectedTournament.settings.score_to_win}`;
      }
      if (this.selectedTournament.settings.game_speed) {
        tournamentOptionGameSpeed.textContent = `Game speed: ${this.selectedTournament.settings.game_speed}`;
      }
      if (this.selectedTournament.settings.time_limit) {
        tournamentOptionTimeLimit.textContent = `Time limit: ${this.selectedTournament.settings.time_limit} min`;
      }
      tournamentOptionCoolMode.textContent =
        this.selectedTournament.settings.cool_mode === true ? 'Buffs: enabled' : 'Buffs: disabled';

      this.registerForm = this.modalBody.querySelector('#tournament-register-form');
      this.aliasInput = this.modalBody.querySelector('#tournament-alias');
      this.aliasInputFeedback = this.modalBody.querySelector('#tournament-alias-feedback');

      if (!this.#state.canEngage) {
        this.registerForm.classList.add('d-none');
        this.confirmButton.classList.add('d-none');
        const alert = this.modalBody.querySelector('#cannot-engage-alert');
        alert.classList.remove('d-none');
        this.cancelButton.textContent = 'Close';
        return;
      }
      this.aliasInput.addEventListener('input', this.validateAliasInput);
      this.aliasInput.value = this.#state.nickname;
      this.confirmButton.disabled = false;
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
      this.cancelButton.textContent = 'Close';
    },
    finished: () => {
      this.modalBody.innerHTML = this.finishedTournamentTemplate();
      const modalTitle = this.modalBody.querySelector('.modal-title');
      const modalTournamentStatus = this.modalBody.querySelector('#modal-tournament-status');
      const tournamentWinnerAvatar = this.modalBody.querySelector('#tournament-winner-avatar');
      const tournamentWinnerAlias = this.modalBody.querySelector('#tournament-winner-alias');
      modalTitle.textContent = this.selectedTournament.name;
      modalTournamentStatus.textContent = `Finished on ${formatDateMDY(this.selectedTournament.date)}`;
      tournamentWinnerAvatar.src = this.selectedTournament.winner.profile.avatar;
      tournamentWinnerAlias.textContent = this.selectedTournament.winner
        ? this.selectedTournament.winner.alias
        : 'Data not available at the moment';

      this.confirmButton.textContent = 'View Results';
      this.confirmButton.disabled = false;
      this.confirmButton.addEventListener('click', this.navigateToOverview);
      this.cancelButton.textContent = 'Close';
    },
  };

  async showTournamentDetail(event, tournamentId = null) {
    if (event) {
      const listItem = event.target.closest('li[tournament-id]');
      if (!listItem || !listItem.hasAttribute('tournament-id')) {
        return;
      }
      const id = listItem.getAttribute('tournament-id');
      this.selectedTournament = this.list.getTournamentById(id);
    } else {
      if (!this.selectedTournament) {
        /* eslint-disable-next-line */
        const resonse = await apiRequest('GET', API_ENDPOINTS.TOURNAMENT(tournamentId), null, false, true);
        if (!resonse.success) {
          log.error('Failed to fetch tournament details:', resonse);
          return;
        }
        this.selectedTournament = resonse.data;
      }
    }
    const tournamentStatus = this.selectedTournament.status;
    if (!tournamentStatus) {
      return;
    }
    this.modalBody.innerHTML = '';
    this.#state.canEngage = await auth.canEngageInGame(false);
    this.tournamentDetail[tournamentStatus]();
    this.modal.show();
  }

  /**
   * Show the tournament creation form from TournamentCreation in a modal.
   * It checks if the user can engage in the game before displaying the form.
   * If the user can engage, it sets up the modal body with the tournament creation component,
   * enables the confirm button, and shows the modal.
   * */
  async showTournamentCreationForm() {
    const canEngage = await auth.canEngageInGame();
    if (!canEngage) {
      return;
    }
    this.modalBody.innerHTML = '';
    const modalBodyContent = document.createElement('tournament-creation');
    this.modalBody.appendChild(modalBodyContent);
    this.confirmButton.textContent = 'Create';
    this.confirmButton.disabled = false;
    this.modal.show();
  }

  async handleCreateTournament(newTournament) {
    const data = {
      name: newTournament.name,
      required_participants: Number(newTournament.requiredParticipants),
      alias: newTournament.alias,
      settings: newTournament.settings,
    };
    const response = await apiRequest('POST', API_ENDPOINTS.NEW_TOURNAMENT, data, false, true);
    if (response.success) {
      this.modal?.hide();
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Tournament created successfully!');
      const tournamentId = response.data.id;
      this.connectToTournamentRoom(tournamentId);
      return;
    }
    let message;
    switch (response.status) {
      case 401:
        this.redirectToLoginPage();
        break;
      case 400:
        message = 'Invalid tournament data. Please check your input.';
      case 403:
        if (!message) {
          message = 'You have an ongoing game activity. Cannot create a new tournament.';
        }
        showAlertMessageForDuration(ALERT_TYPE.ERROR, message);
        this.modal?.hide();
        break;
      case 422:
        this.alert.textContent = response.msg;
        this.alert.classList.remove('d-none');
        break;
      default:
        break;
    }
  }

  /**
   * Confirm the registration for the selected tournament.
   * It sends a POST request to the API with the tournament ID and alias.
   * If the registration is successful, it connects to the tournament room.
   * If the registration fails, it displays an error message.
   * @param {Event} event - The event triggered by the confirm button click.
   */
  async confirmRegister(event) {
    event.stopPropagation();
    this.validateAliasInput(null, this.aliasInput.value);
    if (!this.aliasInput.value || this.aliasInput.classList.contains('is-invalid')) {
      return;
    }
    log.info('Registering for tournament:', this.selectedTournament.id, this.aliasInput.value);
    const response = await apiRequest(
      'POST',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT_REGISTER(this.selectedTournament.id, this.aliasInput.value),
      null,
      false,
      true,
    );
    if (response.success) {
      this.connectToTournamentRoom(this.selectedTournament.id);
      return;
    }
    let message;
    switch (response.status) {
      case 401:
        this.redirectToLoginPage();
        return;
      case 403:
        message = response.msg;
        if (response.msg !== 'Tournament is full.' && response.msg !== 'Tournament is not open.') {
          break;
        }
      case 404:
        message = response.msg;
        showAlertMessageForDuration(ALERT_TYPE.ERROR, message);
        this.modal?.hide();
        this.render();
        return;
      case 429:
        this.modal?.hide();
        return;
      default:
        break;
    }
    const alertWrapper = this.modalBody.querySelector('#registration-fail-alert-wrapper');
    alertWrapper.innerHTML = '';
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible show';
    const alertMessage = document.createElement('p');
    alertMessage.className = 'm-0';
    alertMessage.textContent = message || 'Registration failed. Please try again later.';
    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.className = 'btn-close';
    dismissButton.setAttribute('data-bs-dismiss', 'alert');
    dismissButton.setAttribute('aria-label', 'Close');
    alert.appendChild(alertMessage);
    alert.appendChild(dismissButton);
    alertWrapper.appendChild(alert);
  }

  /**
   * Validate the tournament alias input in tournament registration form.
   * If the alias is invalid, it adds an error class to the input and displays an error message.
   * If the alias is valid, it removes the error class and enables the confirm button.
   * @param {*} event
   */
  validateAliasInput(event, value = null) {
    const valueToValidate = event ? event.target.value : value;
    const validationError = validateTournamentAlias(valueToValidate);
    if (validationError) {
      this.aliasInput.classList.add('is-invalid');
      this.aliasInputFeedback.textContent = validationError;
      this.confirmButton.disabled = true;
    } else {
      this.aliasInput.classList.remove('is-invalid');
      this.aliasInputFeedback.textContent = '';
      this.confirmButton.disabled = false;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Other Even handlers                                                 */
  /* ------------------------------------------------------------------------ */
  // hideModal() {
  //   this.modal?.hide();
  // }

  handleCloseModal() {
    if (this.modalComponent?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.modalBody.innerHTML = '';
    this.confirmButton.classList.remove('d-none');
    this.confirmButton.disabled = true;
    this.cancelButton.textContent = 'Cancel';

    this.aliasInput?.removeEventListener('input', this.validateAliasInput);
    this.confirmButton.removeEventListener('click', this.confirmRegister);
    this.confirmButton.removeEventListener('click', this.navigateToOverview);

    this.aliasInput = null;
    this.aliasInputFeedback = null;
  }

  connectToTournamentRoom(id = this.selectedTournament.id) {
    this.modalComponent.addEventListener(
      'hidden.bs.modal',
      () => {
        router.navigate(`/tournament/${id}`);
      },
      { once: true },
    );
    this.modal?.hide();
  }

  navigateToOverview() {
    this.modalComponent.addEventListener(
      'hidden.bs.modal',
      () => {
        router.navigate(`/tournament-overview/${this.selectedTournament.id}`);
      },
      { once: true },
    );
    this.modal?.hide();
  }

  redirectToLoginPage() {
    this.modalComponent.addEventListener(
      'hidden.bs.modal',
      () => {
        router.redirect('/login');
      },
      { once: true },
    );
    this.modal?.hide();
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
    .tournament-options-tag {
      background-color: var(--pm-primary-500);
      color: var(--pm-primary-100);
      border-radius: 6px;
      padding: 0.2rem 0.6rem;
      font-size: 0.9rem;
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
            <button type="button" class="confirm-button btn fs-5 fw-bolder ms-2" disabled></button>
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
      <div class="d-flex flex-row justify-content-center align-items-center mb-3 gap-2">
        <p class="text-center fs-4 m-0" id="modal-required-participants"></p>
        <p class="text-center fs-6 m-0 pe-1">players</p>
      </div>
      <div class="d-flex flex-wrap justify-content-center mb-5 pb-2">
        <div class="game-options-tag m-2" id="tournament-option-score-to-win"></div>
        <div class="game-options-tag m-2" id="tournament-option-game-speed"></div>
        <div class="game-options-tag m-2" id="tournament-option-time-limit"></div>
        <div class="game-options-tag m-2" id="tournament-option-cool-mode"></div>
      </div>
      <div id="registration-fail-alert-wrapper"></div>
      <p id="cannot-engage-alert" class="text-center d-none">
        You have an ongoing game or tournament.</br>Cannot register.
      </p>
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
}

customElements.define('tournament-menu', TournamentMenu);
