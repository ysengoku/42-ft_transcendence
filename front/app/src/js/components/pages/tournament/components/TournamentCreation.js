/**
 * TournamentCreation Component
 * @description This component allows users to create a new tournament by providing a name, required participants, an alias, and game options applied to tournament.
 * @module TournamentCreation
 */

import { auth } from '@auth';
import { REQUIRED_PARTICIPANTS_OPTIONS, MAX_TOURNAMENT_ALIAS_LENGTH } from '@env';
import { validateTournamentName, validateTournamentAlias } from '../index';

/**
 * @class TournamentCreation
 * @extends {HTMLElement}
 * @classdesc Custom Web Component for creating a tournament.
 */
export class TournamentCreation extends HTMLElement {
  #requiredParticipantsOptions = [4, 8];
  #defaultRequiredParticipants;

  /**
   * Private state
   * @type {Object}
   * @property {string} #state.nickname - User's nickname.
   * @property {Object} #state.newTournament - Details of the new tournament being created.
   * @property {string} #state.newTournament.name - Name of the tournament.
   * @property {number} #state.newTournament.requiredParticipants - Number of required participants for the tournament.
   * @property {Object} #state.newTournament.settings - Game settings for the tournament.
   * @property {boolean} #state.isTournamentNameValid - Validity state of the tournament name.
   * @property {boolean} #state.isAliasValid - Validity state of the tournament alias.
   *
   */
  #state = {
    nickname: '',
    newTournament: {
      name: '',
      requiredParticipants: this.#defaultRequiredParticipants,
      settings: {},
    },
    isTournamentNameValid: true,
    isAliasValid: false,
  };

  /**
   * Initializes the TournamentCreation component.
   * Set up references to the tournament menu, list, modal component.
   * Initialize references for the elements used in this component.
   * Retrieve the required participants options from environment variables and sets the default required participants.
   * Bind the event handlers.
   */
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

    this.#initializeRequiredParticipantsOptions();
    this.#defaultRequiredParticipants = this.#requiredParticipantsOptions[0];

    this.validateTournamentNameInput = this.validateTournamentNameInput.bind(this);
    this.validateAliasInput = this.validateAliasInput.bind(this);
    this.createTournament = this.createTournament.bind(this);
  }

  /**
   * Initializes the required participants options from environment variables.
   * If the environment variable is not set or invalid, it uses default values.
   */
  #initializeRequiredParticipantsOptions() {
    const rawData = REQUIRED_PARTICIPANTS_OPTIONS;
    if (!rawData) {
      return;
    }
    const parsedData = rawData
      .split(',')
      .map((item) => {
        const n = Number(item);
        if (Number.isInteger(n) && n > 0) {
          return n;
        }
        return null;
      })
      .filter((item) => item !== null);
    if (parsedData.length === 2) {
      this.#requiredParticipantsOptions = parsedData;
    } else {
      console.warn(
        'Invalid required participants options in environment variable. Using default values of the component.',
      );
      this.#requiredParticipantsOptions = [4, 8];
    }
  }

  async connectedCallback() {
    const user = await auth.getUser();
    if (!user) {
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
    this.innerHTML = this.style() + this.template();

    // Set up references to the elements used in this component
    this.confirmButton = this.modalComponent.querySelector('.confirm-button');
    this.tournamentNameInput = this.querySelector('#tournament-name');
    this.tournamentNameFeedback = this.querySelector('#tournament-name-feedback');
    this.tournamentAliasInput = this.querySelector('#tournament-alias');
    this.tournamentAliasFeedback = this.querySelector('#tournament-alias-feedback');
    this.alert = this.querySelector('.alert');

    // Initialize the preset input value for alias
    this.tournamentAliasInput.value = this.#state.nickname.substring(0, MAX_TOURNAMENT_ALIAS_LENGTH) || '';
    if (
      this.tournamentAliasInput.value.length > 0 &&
      this.tournamentAliasInput.value.length <= MAX_TOURNAMENT_ALIAS_LENGTH
    ) {
      this.#state.isAliasValid = true;
    }
    // this.updateConfirmButtonState();
    this.confirmButton.disabled = false;

    // Initialize the game options form
    this.gameOptionsForm = this.querySelector('game-options');
    const anyOptions = this.gameOptionsForm.querySelectorAll('.opt-out-option');
    anyOptions.forEach((item) => {
      if (!item.classList.contains('optout-all')) {
        item.classList.add('d-none');
      }
    });
    const isRankedSelector = this.gameOptionsForm.querySelector('#is-ranked-selector');
    isRankedSelector?.classList.add('d-none');

    // Add event listeners for input validation and tournament creation
    this.tournamentNameInput.addEventListener('input', this.validateTournamentNameInput);
    this.tournamentAliasInput.addEventListener('input', this.validateAliasInput);
    this.confirmButton.addEventListener('click', this.createTournament);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  validateTournamentNameInput(event, value) {
    this.alert.classList.add('d-none');
    const valueToValidate = event ? event.target.value : value;
    const validationError = validateTournamentName(valueToValidate);
    if (validationError) {
      this.tournamentNameInput.classList.add('is-invalid');
      this.tournamentNameFeedback.textContent = validationError;
      this.#state.isTournamentNameValid = false;
    } else {
      this.tournamentNameInput.classList.remove('is-invalid');
      this.tournamentNameFeedback.textContent = '';
      this.#state.isTournamentNameValid = true;
    }
  }

  validateAliasInput(event, value) {
    this.alert.classList.add('d-none');
    const valueToValidate = event ? event.target.value : value;
    const validationError = validateTournamentAlias(valueToValidate);
    if (validationError) {
      this.tournamentAliasInput.classList.add('is-invalid');
      this.tournamentAliasFeedback.textContent = validationError;
      this.#state.isAliasValid = false;
    } else {
      this.tournamentAliasInput.classList.remove('is-invalid');
      this.tournamentAliasFeedback.textContent = '';
      this.#state.isAliasValid = true;
    }
  }

  async createTournament(event) {
    event.stopPropagation();
    // Retrieve the input and selected game options
    this.#state.newTournament.name = this.tournamentNameInput.value;
    this.#state.newTournament.requiredParticipants = this.querySelector(
      'input[name="requiredParticipants"]:checked',
    ).value;
    this.#state.newTournament.alias = this.tournamentAliasInput.value;
    this.validateTournamentNameInput(null, this.#state.newTournament.name);
    this.validateAliasInput(null, this.#state.newTournament.alias);
    if (!this.#state.isAliasValid || !this.#state.isTournamentNameValid) {
      return;
    }
    this.#state.newTournament.settings = this.gameOptionsForm.selectedOptionsAsObject;
    if (this.#state.newTournament.settings && this.#state.newTournament.settings.ranked) {
      this.#state.newTournament.settings.ranked = false;
    }
    const tounamentMenu = document.querySelector('tournament-menu');
    if (tounamentMenu) {
      tounamentMenu.handleCreateTournament(this.#state.newTournament);
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
          <label for="tournament-name" class="form-label fs-5">Tournament name</label>
          <input type="text" class="form-control" id="tournament-name" placeholder="Tournament name" autocomplete="off" required>
          <div class="invalid-feedback" id="tournament-name-feedback"></div>
        </div>
    
        <div class="d-flex flex-column mb-4">
          <label class="mb-2 fs-5">Number of participants</label>
          <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption1}" value="${option1}" ${option1 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption1}">${option1}</label>
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption2}" value="${option2}" ${option2 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption2}">${option2}</label>
          </div>
        </div>

        <div class="mb-5 pb-3">
          <label for="tournament-alias" class="form-label fs-5">Set your tournament alias</label>
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
