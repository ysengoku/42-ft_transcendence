import { router } from '@router';
import { socketManager } from '@socket';

export class TournamentRegistration extends HTMLElement {
  #maxAliasLength = Number(import.meta.env.VITE_MAX_ALIAS_LENGTH) || 12;

  #state = {
    tournament: null,
    alias: '',
  };

  constructor() {
    super();

    this.handleAliasInput = this.handleAliasInput.bind(this);
    this.confirmRegister = this.confirmRegister.bind(this);
    this.connectToTournamentRoom = this.connectToTournamentRoom.bind(this);
    this.handleRegistrationFail = this.handleRegistrationFail.bind(this);
  }

  set data(tournament) {
    this.#state.tournament = tournament;
    this.render();
  }

  disconnectedCallback() {
    this.aliasInput?.removeEventListener('input', this.handleAliasInput);
    this.confirmButton?.removeEventListener('click', this.confirmRegister);
    document.removeEventListener('tournamentRegistered', this.connectToTournamentRoom);
    document.removeEventListener('tournamentRegisterFail', this.handleRegistrationFail);
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template();

    this.modalComponent = document.querySelector('.modal');
    this.confirmButton = this.modalComponent.querySelector('.confirm-button');
    const modalTitle = this.querySelector('.modal-title');
    const modalTournamentStatus = this.querySelector('#modal-tournament-status');
    this.modalRequiredParticipants = this.querySelector('#modal-required-participants');
    this.aliasInput = this.querySelector('#tournament-alias');

    modalTitle.textContent = this.#state.tournament.tournament_name;
    modalTournamentStatus.textContent = 'Open for entries';
    this.modalRequiredParticipants.textContent = `${this.#state.tournament.participants.length} / ${this.#state.tournament.required_participants} players`;
    this.confirmButton.textContent = 'Register';

    this.aliasInput.addEventListener('input', this.handleAliasInput);
    this.confirmButton.addEventListener('click', this.confirmRegister);
  }

  /* ------------------------------------------------------------------------ */
  /*      Event handling                                                      */
  /* ------------------------------------------------------------------------ */
  handleAliasInput(event) {
    const tournamentAlias = this.querySelector('#tournament-alias');
    const tournamentAliasFeedback = this.querySelector('#tournament-alias-feedback');
    if (event.target.value.length < 1) {
      tournamentAlias.classList.add('is-invalid');
      tournamentAliasFeedback.textContent = `Alias cannot be empty`;
      this.confirmButton.disabled = true;
    } else if (event.target.value.length > this.#maxAliasLength) {
      tournamentAlias.classList.add('is-invalid');
      tournamentAliasFeedback.textContent = `Alias must be less than ${this.#maxAliasLength} characters.`;
      this.confirmButton.disabled = true;
    } else {
      tournamentAlias.classList.remove('is-invalid');
      tournamentAliasFeedback.textContent = '';
      this.confirmButton.disabled = false;
    }
  }

  confirmRegister(event) {
    event.stopPropagation();
    this.#state.alias = this.aliasInput.value;

    // --- Waiting for the server to be ready to handle ws connections ---
    // socketManager.openSocket('tournament', this.#state.tournament.tournament_id);
    const data = {
      action: 'register',
      data: { alias: this.#state.alias },
    }
    // --- Waiting for the server to be ready to handle ws connections ---
    // socketManager.sendMessage('tournament', data);
    console.log('Registering for tournament:', data);

    document.addEventListener('tournamentRegistered', this.connectToTournamentRoom);
    document.addEventListener('tournamentRegisterFail', this.handleRegistrationFail);
  }

  connectToTournamentRoom(event) {
    // If receive registered message
    document.dispatchEvent(new CustomEvent('hide-modal', { bubbles: true,}));
    // TODO: Navigate to tournament page
	// router.navigate(`/tournament/${this.#state.tournament.tournament_id}`);
  }

  handleRegistrationFail(event) {
	const reason = event.detail.reason;
    // If alias is already taken, show message
    // Else if the tournmant is full, show message and close modal
    document.dispatchEvent(new CustomEvent('hide-modal', { bubbles: true,}));
  }

  /* ------------------------------------------------------------------------ */
  /*      Template                                                            */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column align-items-center px-4">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-tournament-status"></p>
      <p class="text-center" id="modal-required-participants"></p>
      <div id="tournament-register-form" class="d-flex flex-column w-100 gap-2">
      <div class="mb-3">
        <label for="tournament-alias" class="form-label">Tournament Alias</label>
        <input type="text" class="form-control" id="tournament-alias" placeholder="Your alias for the tournament" required>
        <div class="invalid-feedback" id="tournament-alias-feedback"></div>
      </div>
      </div>
    </div>
    `;
    }
}

customElements.define('tournament-registration', TournamentRegistration);
