import { apiRequest, API_ENDPOINTS } from '@api'

export class TournamentCreation extends HTMLElement {
  #requiredParticipantsOptions = [4, 8];
  #defaultRequiredParticipants;
  #maxTournamentNameLength = Number(import.meta.env.VITE_MAX_TOURNAMENT_NAME_LENGTH) || 50;

  #state = {
    newTournament: {
      name: '',
      requiredParticipants: this.#defaultRequiredParticipants,
    },
  }
  constructor() {
    super();
	  this.tournamentMenu = document.querySelector('tournament-menu');
    this.list = document.querySelector('tournament-list');
    this.modalComponent = document.querySelector('.modal');
    this.confirmButton = null;
	  this.alert = null;
    this.tournamentNameInput = null;
    this.tournamentNameFeedback = null;

    const requiredParticipantsOptions = import.meta.env.VITE_REQUIRED_PARTICIPANTS_OPTIONS;
    if (requiredParticipantsOptions) {
      const options = requiredParticipantsOptions.split(',').map(Number);
      if (options.length === 2) {
        this.#requiredParticipantsOptions = options;
      }
    }
    this.#defaultRequiredParticipants = this.#requiredParticipantsOptions[0];

    this.handleTournamentInputName = this.handleTournamentInputName.bind(this);
    this.createTournament = this.createTournament.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.tournamentNameInput?.removeEventListener('input', this.handleTournamentInputName);
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
	  this.alert = this.querySelector('.alert');

    this.tournamentNameInput.addEventListener('input', this.handleTournamentInputName);
    this.confirmButton.addEventListener('click', this.createTournament);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */

  handleTournamentInputName(event) {
	this.alert.classList.add('d-none');
    if (event.target.value.length < 1) {
      this.tournamentNameInput.classList.add('is-invalid');
      this.tournamentNameFeedback.textContent = `Tournament name must be at least 3 characters.`;
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

  async createTournament(event) {
    event.stopPropagation();
    this.#state.newTournament.name = this.tournamentNameInput.value;
    this.#state.newTournament.requiredParticipants = this.querySelector('input[name="requiredParticipants"]:checked').value;

    console.log('Creating tournament:', this.#state.newTournament);
    const data = {
      tournament_name: this.#state.newTournament.name,
      required_participants: this.#state.newTournament.requiredParticipants,
    };
    const response = await apiRequest(
        'POST',
        API_ENDPOINTS.NEW_TOURNAMENT,
        data, false, true);
    console.log('Tournament creation response:', response);
    if (response.success) {
      console.log('Tournament created successfully:', response.data);
      this.list.setNewTournament(response.data);
      this.#state.newTournament = {
        name: '',
        requiredParticipants: this.#defaultRequiredParticipants,
      };
    document.dispatchEvent(new CustomEvent('hide-modal', { bubbles: true,}));
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
        <div class="mb-3">
          <label for="tournament-name" class="form-label">Tournament name</label>
          <input type="text" class="form-control" id="tournament-name" placeholder="Tournament name" autocomplete="off" required>
          <div class="invalid-feedback" id="tournament-name-feedback"></div>
        </div>
    
        <div class="d-flex flex-column mb-3">
          <label class="mb-2">Number of participants</label>
          <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption1}" value="${option1}" ${option1 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption1}">${option1}</label>
            <input type="radio" class="btn-check" name="requiredParticipants" id="${idForOption2}" value="${option2}" ${option2 === this.#defaultRequiredParticipants ? 'checked' : ''}>
            <label class="btn btn-outline-create-tournament py-0" for="${idForOption2}">${option2}</label>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  style() {
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
    `;
  }
}

customElements.define('tournament-creation', TournamentCreation);
