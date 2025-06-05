import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { auth } from '@auth';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class TournamentCreation extends HTMLElement {
  #requiredParticipantsOptions = [4, 8];
  #defaultRequiredParticipants;
  #maxTournamentNameLength = Number(import.meta.env.VITE_MAX_TOURNAMENT_NAME_LENGTH) || 50;
  #maxTournamentAliasLength = Number(import.meta.env.VITE_MAX_TOURNAMENT_ALIAS_LENGTH) || 12;

  #state = {
    nickname: '',
    newTournament: {
      name: '',
      requiredParticipants: this.#defaultRequiredParticipants,
    },
  };

  constructor() {
    super();
    this.tournamentMenu = document.querySelector('tournament-menu');
    this.list = document.querySelector('tournament-list');
    this.modalComponent = document.querySelector('.modal');
    this.confirmButton = null;
    this.alert = null;
    this.tournamentNameInput = null;
    this.tournamentNameFeedback = null;
    this.gameOptionsForm = null;

    const requiredParticipantsOptions = import.meta.env.VITE_REQUIRED_PARTICIPANTS_OPTIONS;
    if (requiredParticipantsOptions) {
      const options = requiredParticipantsOptions.split(',').map(Number);
      if (options.length === 2) {
        this.#requiredParticipantsOptions = options;
      }
    }
    this.#defaultRequiredParticipants = this.#requiredParticipantsOptions[0];

    this.validateTournamentNameInput = this.validateTournamentNameInput.bind(this);
    this.validateAliasInput = this.validateAliasInput.bind(this);
    this.createTournament = this.createTournament.bind(this);
  }

  async connectedCallback() {
    const user = await auth.getUser();
    if (!user) {
      router.navigate('/login');
      return;
    }
    this.#state.nickname = user.nickname;
    this.render();
  }

  disconnectedCallback() {
    this.tournamentNameInput?.removeEventListener('input', this.validateTournamentNameInput);
    this.tournamentAliasInput?.removeEventListener('input', this.validateAliasInput);
    this.confirmButton?.removeEventListener('click', this.createTournament);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.confirmButton = this.modalComponent.querySelector('.confirm-button');
    this.tournamentNameInput = this.querySelector('#tournament-name');
    this.tournamentNameFeedback = this.querySelector('#tournament-name-feedback');
    this.tournamentAliasInput = this.querySelector('#tournament-alias');
    this.tournamentAliasFeedback = this.querySelector('#tournament-alias-feedback');
    this.alert = this.querySelector('.alert');

    this.tournamentAliasInput.value = this.#state.nickname;

    this.tournamentNameInput.addEventListener('input', this.validateTournamentNameInput);
    this.tournamentAliasInput.addEventListener('input', this.validateAliasInput);
    this.confirmButton.addEventListener('click', this.createTournament);

    this.gameOptionsForm = this.querySelector('game-options');
    const anyOptions = this.gameOptionsForm.querySelectorAll('.opt-out-option');
    anyOptions.forEach((item) => {
      if (!item.classList.contains('optout-all')) {
        item.classList.add('d-none');
      }
    });
    const isRankedSelector = this.gameOptionsForm.querySelector('#is-ranked-selector');
    isRankedSelector?.classList.add('d-none');
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  validateTournamentNameInput(event) {
    this.alert.classList.add('d-none');
    if (event.target.value.length < 1) {
      this.tournamentNameInput.classList.add('is-invalid');
      this.tournamentNameFeedback.textContent = 'Tournament name must be at least 1 character.';
      this.confirmButton.disabled = true;
    } else if (event.target.value.length > this.#maxTournamentNameLength) {
      this.tournamentNameInput.classList.add('is-invalid');
      this.tournamentNameFeedback.textContent = `Tournament name must be less than ${this.#maxTournamentNameLength} characters.`;
      this.confirmButton.disabled = true;
    } else {
      this.tournamentNameInput.classList.remove('is-invalid');
      this.tournamentNameFeedback.textContent = '';
      this.confirmButton.disabled = false;
    }
  }

  validateAliasInput(event) {
    this.alert.classList.add('d-none');
    if (event.target.value.length < 1) {
      this.tournamentAliasInput.classList.add('is-invalid');
      this.tournamentAliasFeedback.textContent = 'Alias must be at least 1 character.';
      this.confirmButton.disabled = true;
    } else if (event.target.value.length > this.#maxTournamentAliasLength) {
      this.tournamentAliasInput.classList.add('is-invalid');
      this.tournamentAliasFeedback.textContent = `Alias must be less than ${this.#maxTournamentAliasLength} characters.`;
      this.confirmButton.disabled = true;
    } else {
      this.tournamentAliasInput.classList.remove('is-invalid');
      this.tournamentAliasFeedback.textContent = '';
      this.confirmButton.disabled = false;
    }
  }

  async createTournament(event) {
    event.stopPropagation();
    this.#state.newTournament.name = this.tournamentNameInput.value;
    this.#state.newTournament.requiredParticipants = this.querySelector(
      'input[name="requiredParticipants"]:checked',
    ).value;
    this.#state.newTournament.alias = this.tournamentAliasInput.value;
    const options = this.gameOptionsForm.selectedOptions;
    if (options && options.ranked) {
      options.ranked = false;
    }

    const data = {
      name: this.#state.newTournament.name,
      required_participants: this.#state.newTournament.requiredParticipants,
      alias: this.#state.newTournament.alias,
      options: options,
    };
    const response = await apiRequest('POST', API_ENDPOINTS.NEW_TOURNAMENT, data, false, true);
    if (response.success) {
      document.dispatchEvent(new CustomEvent('hide-modal', { bubbles: true }));
      showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Tournament created successfully!', 5000);
      const tournamentId = response.data.id;
      router.navigate(`/tournament/${tournamentId}`);
    } else if (response.status === 422) {
      this.alert.textContent = response.msg;
      this.alert.classList.remove('d-none');
      this.confirmButton.disabled = true;
    } else if (response.status !== 401 && response.status !== 500) {
      // TODO: Handle other error messages
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */

  template() {
    const option1 = this.#requiredParticipantsOptions[0];
    const option2 = this.#requiredParticipantsOptions[1];
    const idForOption1 = `required-participants-${this.#requiredParticipantsOptions[0]}`;
    const idForOption2 = `required-participants-${this.#requiredParticipantsOptions[1]}`;

    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center text-wrap pb-4">Create a tournament</h2>
	    <div class="alert alert-danger d-none" role="alert""></div>
      <div id="create-tournament-form" class="d-flex flex-column w-100 gap-2">
        <div class="mb-4">
          <label for="tournament-name" class="form-label fs-5 fw-bold">Tournament name</label>
          <input type="text" class="form-control" id="tournament-name" placeholder="Tournament name" autocomplete="off" required>
          <div class="invalid-feedback" id="tournament-name-feedback"></div>
        </div>
    
        <div class="d-flex flex-column mb-4">
          <label class="mb-2 fs-5 fw-bold">Number of participants</label>
          <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption1}" value="${option1}" ${option1 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption1}">${option1}</label>
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption2}" value="${option2}" ${option2 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption2}">${option2}</label>
          </div>
        </div>

        <div class="mb-5 pb-3">
          <label for="tournament-alias" class="form-label fs-5 fw-bold">Set your tournament alias</label>
          <input type="text" class="form-control" id="tournament-alias" placeholder="Your alias" autocomplete="off" required>
          <div class="invalid-feedback" id="tournament-alias-feedback"></div>
        </div>

        <game-options></game-options>

      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    .btn-outline-create-tournament {
      color: var(--pm-primary-100) !important;
      border: 1px solid var(--pm-gray-500);
      background-color: var(--pm-gray-400);
    }
    .btn-check:checked + .btn-outline-create-tournament,
    .btn-check:active + .btn-outline-create-tournament,
    .btn-outline-create-tournament.active {
      color: var(--pm-primary-100) !important;
      font-weight: 600;
      background-color: var(--pm-primary-500);
      border-color: var(--pm-primary-500);
    }
    </style>
    `;
  }
}

customElements.define('tournament-creation', TournamentCreation);
