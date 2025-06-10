import { router } from '@router';
import { apiRequest, API_ENDPOINTS } from '@api';
import { showAlertMessageForDuration, ALERT_TYPE } from '@utils';

export class TournamentPending extends HTMLElement {
  #state = {
    id: '',
    requiredParticipants: 0,
    participants: [],
    creatorUsername: '',
    loggedInUsername: '',
  };

  constructor() {
    super();

    this.currentParticipantsCount = null;
    this.requiredParticipants = null;
    this.participantsWrapper = null;
    this.cancelTournamentButton = null;
    this.unregisterButton = null;
    this.modalElement = null;

    this.handleUnregisterButtonClick = this.handleUnregisterButtonClick.bind(this);
    this.handleCancelTournamentButtonClick = this.handleCancelTournamentButtonClick.bind(this);
    this.handleConfirmationFromModal = this.handleConfirmationFromModal.bind(this);
  }

  set data(data) {
    this.#state.id = data.id;
    this.#state.requiredParticipants = data.required_participants;
    this.#state.participants = data.participants;
    this.#state.creatorUsername = data.creatorUsername;
    this.#state.loggedInUsername = data.loggedInUsername;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.unregisterButton?.removeEventListener('click', this.handleUnregisterButtonClick);
    this.cancelTournamentButton?.removeEventListener('click', this.handleCancelTournamentButtonClick);
    this.currentParticipantsCount = null;
  }

  /* ------------------------------------------------------------------------ */
  /*      Render                                                              */
  /* ------------------------------------------------------------------------ */
  render() {
    this.innerHTML = this.template() + this.style();

    this.currentParticipantsCount = this.querySelector('#current-participants-count');
    this.requiredParticipants = this.querySelector('#required-participants');
    this.participantsWrapper = this.querySelector('#participants-wrapper');
    this.cancelTournamentButton = this.querySelector('#cancel-tournament-button');
    this.unregisterButton = this.querySelector('#cancel-registration-button');
    // debugger;
    // this.modalElement = document.querySelector('tournament-modal');
    // debugger;

    this.currentParticipantsCount.textContent = `${this.#state.participants.length}`;
    this.requiredParticipants.textContent = ` / ${this.#state.requiredParticipants}`;
    // debugger;
    this.#state.participants.forEach((participant) => {
      this.addParticipant(participant);
    });
    // debugger;
    if (this.#state.creatorUsername === this.#state.loggedInUsername) {
      this.cancelTournamentButton.classList.remove('d-none');
      this.cancelTournamentButton.addEventListener('click', this.handleCancelTournamentButtonClick);
    }
    // debugger;
    this.unregisterButton.addEventListener('click', this.handleUnregisterButtonClick);
    // debugger;
  }

  /* ------------------------------------------------------------------------ */
  /*      WebSocket Messages handling                                         */
  /* ------------------------------------------------------------------------ */
  // ws new_registration listener
  addParticipant(data) {
    const participant = document.createElement('div');
    participant.innerHTML = this.participantTemplate();

    const avatarElement = participant.querySelector('.participant-avatar');
    const aliasElement = participant.querySelector('.participant-alias');
    avatarElement.src = data.profile.avatar;
    aliasElement.textContent = data.alias;
    participant.id = `participant-${data.alias}`;

    this.participantsWrapper.appendChild(participant);
  }

  // ws registration_canceled listener
  removeParticipant(data) {
    const participant = this.participantsWrapper.querySelector(`#participant-${data.alias}`);
    if (participant) {
      this.participantsWrapper.removeChild(participant);
    }
    const participantData = this.#state.participants.find((p) => p.alias === data.alias);
    if (participantData) {
      this.#state.participants.splice(this.#state.participants.indexOf(participantData), 1);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Events handling                                                     */
  /* ------------------------------------------------------------------------ */
  handleUnregisterButtonClick() {
    this.modalElement.contentType = this.modalElement.CONTENT_TYPE.UNREGISTER_TOURNAMENT;
    this.modalElement.showModal();
    // const confirmationModal = document.createElement('tournament-modal');
    // console.log('confirmationModal', confirmationModal);
    // this.appendChild(confirmationModal);
    // confirmationModal.render();
    // confirmationModal.contentType = confirmationModal.CONTENT_TYPE.UNREGISTER_TOURNAMENT;
    // confirmationModal.showModal();
    document.addEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
  }

  async unregisterTournament() {
    const response = await apiRequest(
      'DELETE',
      /* eslint-disable-next-line new-cap */
      API_ENDPOINTS.TOURNAMENT_UNREGISTER(this.#state.id),
      null,
      false,
      true,
    );
    if (!response.success) {
      showAlertMessageForDuration(ALERT_TYPE.ERROR, response.msg);
      return;
    }
    this.unregisterButton?.removeEventListener('click', this.handleUnregisterButtonClick);
    this.cancelTournamentButton?.removeEventListener('click', this.handleCancelTournamentButtonClick);
    this.innerHTML = '';
    this.innerHTML = this.unresigteredTemplate();
    const goToHomeButton = this.querySelector('#go-to-home-button');
    const goToTournamentMenuButton = this.querySelector('#go-to-tournament-menu-button');
    goToHomeButton.addEventListener(
      'click',
      () => {
        router.redirect('/home');
      },
      { once: true },
    );
    goToTournamentMenuButton.addEventListener(
      'click',
      () => {
        router.redirect('/tournament-menu');
      },
      { once: true },
    );
  }

  handleCancelTournamentButtonClick() {
    this.modalElement.contentType = this.modalElement.CONTENT_TYPE.CANCEL_TOURNAMENT;
    this.modalElement.showModal();
    document.addEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
  }

  handleConfirmationFromModal(event) {
    const type = event.detail.contentType;
    document.removeEventListener('tournament-modal-confirm', this.handleConfirmationFromModal);
    if (type === this.modalElement.CONTENT_TYPE.CANCEL_TOURNAMENT) {
      const tournamentPageElement = document.querySelector('tournament-room');
      if (tournamentPageElement) {
        tournamentPageElement.cancelTournament();
      }
      return;
    }
    if (type === this.modalElement.CONTENT_TYPE.UNREGISTER_TOURNAMENT) {
      this.unregisterTournament();
      return;
    }
  }

  /* ------------------------------------------------------------------------ */
  /*      Template & style                                                    */
  /* ------------------------------------------------------------------------ */
  template() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
      <p class="text-center m-1">Gathering Gunslingers...</p>
      <div class="d-flex flex-row justify-content-center align-items-center mb-5">
        <p class="m-0 pe-1 fs-2" id="current-participants-count"></p>
        <p class="m-0 fs-4" id="required-participants"></p>
      </div>
      <p class="text-center mt-4 mb-2 fs-5 fw-bold">Gunslingers in the Arena</p>
      <div class="d-flex flex-row flex-wrap justify-content-center w-75" id="participants-wrapper"></div>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn d-none" id="cancel-tournament-button">Call off the tournament</div>
        <div class="btn" id="cancel-registration-button">Unregister from the tournament</div>
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
    #current-participants-count,
    #required-participants {
      font-family: 'van dyke', serif;
    }
    #cancel-tournament-button,
    #cancel-registration-button {
	    color: var(--pm-text-danger);
    }
    </style>
    `;
  }

  participantTemplate() {
    return `
    <div class="d-flex flex-row justify-content-center align-items-center mx-4 my-2 gap-2">
      <img class="participant-avatar avatar-xxs rounded-circle" src="/img/default_avatar.png" />
      <p class="participant-alias m-0 fs-5"></p>
    </div>
    `;
  }

  unresigteredTemplate() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center mt-3">
	    <p class="fs-4">You’ve backed out of this tournament.</p>
      <div class="d-flex flex-row justify-content-center align-items-center mt-5 mb-2 gap-3">
        <div class="btn" id="go-to-home-button">Back to Saloon</div>
        <div class="btn" id="go-to-tournament-menu-button">Find another tournament</div>
      </div>
    </div>
    `;
  }
}

customElements.define('tournament-pending', TournamentPending);
