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
  }

  set data(tournament) {
    this.#state.tournament = tournament;
    this.render();
  }

  disconnectedCallback() {
    this.aliasInput?.removeEventListener('input', this.handleAliasInput);
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
    const currentParticipants = this.#state.tournament.participants_count ? this.#state.tournament.participants_count : 0;
    this.modalRequiredParticipants.textContent = `${currentParticipants} / ${this.#state.tournament.required_participants} players`;

    this.aliasInput.addEventListener('input', this.handleAliasInput);
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

  /* ------------------------------------------------------------------------ */
  /*      Template                                                            */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column align-items-center px-4 w-100">
      <h2 class="modal-title text-center"></h2>
      <p class="text-center" id="modal-tournament-status"></p>
      <p class="text-center" id="modal-required-participants"></p>
      <div id="tournament-register-form" class="d-flex flex-column w-100 gap-2">
      <div class="mb-3">
        <label for="tournament-alias" class="form-label">Tournament Alias</label>
        <input type="text" class="form-control" id="tournament-alias" placeholder="Your alias for the tournament" autocomplete="off" required>
        <div class="invalid-feedback" id="tournament-alias-feedback"></div>
      </div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-registration', TournamentRegistration);
